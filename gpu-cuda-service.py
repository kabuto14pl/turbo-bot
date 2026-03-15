#!/usr/bin/env python3
"""
PATCH #43: GPU-ONLY CUDA Service  RTX 5070 Ti @ 40% Utilization

Runs on LOCAL PC (Windows) with RTX 5070 Ti GPU.
VPS bot connects via SSH tunnel: VPS:4001  LocalPC:4000

Endpoints:
    GET  /ping              Lightweight liveness probe
  GET  /health            GPU status + VRAM usage
  POST /gpu/qmc           Quantum Monte Carlo path generation (CUDA)
  POST /gpu/qaoa-weights  QAOA strategy weight optimization (CUDA)
  POST /gpu/vqc-regime    VQC regime classification (CUDA)
  POST /gpu/matmul        GPU matrix multiplication
  POST /gpu/var           GPU VaR/CVaR calculation

Requirements:
  pip install torch fastapi uvicorn pynvml

Usage:
  python gpu-cuda-service.py
  # Runs on http://0.0.0.0:4000
"""

import os
import time
import math
import json
import logging
import traceback
from typing import Optional, List, Dict, Any

#  FastAPI 
try:
    from fastapi import FastAPI, HTTPException
    from fastapi.responses import JSONResponse
    import uvicorn
except ImportError:
    print("ERROR: FastAPI not installed. Run: pip install fastapi uvicorn")
    exit(1)

#  PyTorch CUDA (with CPU fallback) 
GPU_AVAILABLE = False
GPU_INIT_ERROR = None
device = None
gpu_name = "N/A"
vram_total = 0
BACKEND = "cpu"

try:
    import torch
    print(f"[DIAG] PyTorch version: {torch.__version__}")
    print(f"[DIAG] CUDA build: {torch.version.cuda or 'NOT BUILT WITH CUDA'}")
    print(f"[DIAG] CUDA available: {torch.cuda.is_available()}")
    if hasattr(torch.cuda, 'device_count'):
        print(f"[DIAG] CUDA device count: {torch.cuda.device_count()}")
    if not torch.cuda.is_available():
        print("")
        print("=" * 70)
        print("  ⚠️  CUDA NOT AVAILABLE — GPU WILL NOT BE USED")
        print("  ⚠️  Backtest will run on CPU (MUCH SLOWER)")
        print("")
        if 'cpu' in (torch.version.cuda or 'cpu').lower() or torch.version.cuda is None:
            print("  FIX: You have PyTorch CPU-only build installed.")
            print("  Run this command to install PyTorch with CUDA:")
            print("")
            print("    pip install torch --index-url https://download.pytorch.org/whl/cu124")
            print("")
        else:
            print(f"  PyTorch CUDA build: {torch.version.cuda}")
            print("  But CUDA runtime not detected. Check NVIDIA drivers.")
            print("  Run: nvidia-smi")
        print("=" * 70)
        print("")
        GPU_AVAILABLE = False
        device = torch.device('cpu')
        BACKEND = "cpu"
    else:
        GPU_AVAILABLE = True
        #  40% GPU memory limit 
        torch.cuda.set_per_process_memory_fraction(0.4, 0)
        device = torch.device('cuda:0')
        gpu_name = torch.cuda.get_device_name(0)
        vram_total = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        BACKEND = "cuda"
        print(f"")
        print(f"  ✅ GPU ACTIVE: {gpu_name}")
        print(f"  ✅ VRAM: {vram_total:.1f} GB | Limit: 40% ({vram_total*0.4:.1f} GB)")
        print(f"")
except Exception as init_error:
    GPU_AVAILABLE = False
    GPU_INIT_ERROR = str(init_error)
    device = torch.device('cpu') if 'torch' in dir() else None
    BACKEND = "cpu"
    print(f"WARNING: CUDA initialization failed, using CPU: {GPU_INIT_ERROR}")
    traceback.print_exc()

#  NVML for GPU monitoring 
try:
    import pynvml
    pynvml.nvmlInit()
    nvml_handle = pynvml.nvmlDeviceGetHandleByIndex(0)
    NVML_OK = True
except Exception:
    NVML_OK = False
    nvml_handle = None

#  Logging 
logging.basicConfig(level=logging.INFO, format='%(asctime)s [GPU] %(message)s')
logger = logging.getLogger(__name__)

#  FastAPI App 
SERVICE_VERSION = "1.1.0-CPU-FALLBACK"

app = FastAPI(title="Turbo-Bot GPU Service", version=SERVICE_VERSION)

# Stats tracking
stats = {
    "start_time": time.time(),
    "requests": {"qmc": 0, "qaoa": 0, "vqc": 0, "matmul": 0, "var": 0},
    "total_compute_ms": 0,
    "errors": 0,
}


def get_gpu_info() -> dict:
    """Get current GPU utilization and VRAM usage."""
    info = {
        "device": gpu_name if GPU_AVAILABLE else "N/A",
        "cuda_available": GPU_AVAILABLE,
        "init_error": GPU_INIT_ERROR,
        "vram_total_gb": round(vram_total, 2) if GPU_AVAILABLE else 0,
        "vram_used_gb": 0,
        "vram_free_gb": 0,
        "utilization_pct": 0,
        "temperature_c": 0,
        "memory_limit_pct": 40,
    }
    if GPU_AVAILABLE:
        info["vram_used_gb"] = round(torch.cuda.memory_allocated(0) / (1024**3), 3)
        info["vram_free_gb"] = round((vram_total * 0.4) - info["vram_used_gb"], 3)
    if NVML_OK:
        try:
            util = pynvml.nvmlDeviceGetUtilizationRates(nvml_handle)
            mem = pynvml.nvmlDeviceGetMemoryInfo(nvml_handle)
            temp = pynvml.nvmlDeviceGetTemperature(nvml_handle, pynvml.NVML_TEMPERATURE_GPU)
            info["utilization_pct"] = util.gpu
            info["vram_used_gb"] = round(mem.used / (1024**3), 3)
            info["vram_free_gb"] = round(mem.free / (1024**3), 3)
            info["temperature_c"] = temp
        except Exception:
            pass
    return info


# 
# HEALTH CHECK
# 

@app.get("/ping")
async def ping():
    """Lightweight liveness endpoint for the Windows watchdog."""
    return {
        "status": "ok",
        "service": "turbo-bot-gpu-cuda",
        "version": SERVICE_VERSION,
        "uptime_s": round(time.time() - stats["start_time"]),
    }

@app.get("/health")
async def health():
    """Returns GPU status. Used by VPS bot RemoteGPUClient.ping()."""
    return {
        "status": "online" if GPU_AVAILABLE else ("online-cpu" if device is not None else "degraded"),
        "backend": BACKEND,
        "gpu_active": GPU_AVAILABLE,
        "service": "turbo-bot-gpu-cuda",
        "version": SERVICE_VERSION,
        "uptime_s": round(time.time() - stats["start_time"]),
        "init_error": GPU_INIT_ERROR,
        "gpu": get_gpu_info(),
        "stats": stats,
    }


# 
# QMC  Quantum Monte Carlo Path Generation (CUDA)
# 

@app.post("/gpu/qmc")
async def gpu_qmc(body: dict):
    """
    Generate Monte Carlo paths using GPU-accelerated random sampling.
    Geometric Brownian Motion with optional Merton jump-diffusion.
    """
    if device is None:
        raise HTTPException(status_code=503, detail="PyTorch not available")
    if not GPU_AVAILABLE:
        logger.warning("QMC running on CPU — install CUDA PyTorch for GPU acceleration")

    stats["requests"]["qmc"] += 1
    t0 = time.perf_counter()

    try:
        n_paths = min(int(body.get("nPaths", 8000)), 500000)
        n_steps = min(int(body.get("nSteps", 5)), 252)
        current_price = float(body.get("currentPrice", 1.0))
        mu = float(body.get("mu", 0.05))
        sigma = float(body.get("sigma", 0.2))
        dt = float(body.get("dt", 1/252))
        jump_intensity = float(body.get("jumpIntensity", 0))
        jump_mean = float(body.get("jumpMean", 0))
        jump_std = float(body.get("jumpStd", 0))

        with torch.no_grad():
            drift = (mu - 0.5 * sigma**2) * dt
            diffusion = sigma * math.sqrt(dt)
            z = torch.randn(n_paths, n_steps, device=device)
            log_returns = drift + diffusion * z

            if jump_intensity > 0:
                jump_mask = torch.rand(n_paths, n_steps, device=device) < (jump_intensity * dt)
                jump_sizes = torch.randn(n_paths, n_steps, device=device) * jump_std + jump_mean
                log_returns = log_returns + jump_mask.float() * jump_sizes

            cum_returns = torch.cumsum(log_returns, dim=1)
            final_log_returns = cum_returns[:, -1]
            final_prices = (current_price * torch.exp(final_log_returns)).cpu().tolist()

        elapsed_ms = (time.perf_counter() - t0) * 1000
        stats["total_compute_ms"] += elapsed_ms
        logger.info(f"QMC: {n_paths} paths x {n_steps} steps in {elapsed_ms:.1f}ms")

        return {
            "finalPrices": final_prices,
            "pathsGenerated": n_paths,
            "nSteps": n_steps,
            "computeTimeMs": round(elapsed_ms, 2),
            "backend": BACKEND,
            "device": gpu_name if GPU_AVAILABLE else "cpu",
        }

    except Exception as e:
        stats["errors"] += 1
        logger.error(f"QMC error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 
# QAOA  Strategy Weight Optimization (CUDA)
# 

@app.post("/gpu/qaoa-weights")
async def gpu_qaoa(body: dict):
    """Optimize strategy weights using GPU-accelerated QAOA simulation."""
    if device is None:
        raise HTTPException(status_code=503, detail="PyTorch not available")
    if not GPU_AVAILABLE:
        logger.warning("QAOA running on CPU — install CUDA PyTorch for GPU acceleration")

    stats["requests"]["qaoa"] += 1
    t0 = time.perf_counter()

    try:
        strategy_metrics = body.get("strategyMetrics", {})
        max_strategies = int(body.get("maxStrategies", 5))
        strategies = list(strategy_metrics.keys())
        n = len(strategies)

        if n == 0:
            return {"selectedStrategies": [], "weights": {}, "expectedUtility": 0}

        n_qubits = min(n, 8)
        n_layers = 4
        n_iterations = 200

        h = torch.zeros(n_qubits, device=device)
        for i in range(n_qubits):
            m = strategy_metrics.get(strategies[i], {})
            h[i] = float(m.get("sharpe", 0)) * 0.5 - float(m.get("risk", 0.5)) * 0.3 + float(m.get("returns", 0)) * 0.2

        best_energy = float('-inf')
        best_state = 0
        n_samples = 4096

        with torch.no_grad():
            for iteration in range(n_iterations):
                samples = torch.randint(0, 2, (n_samples, n_qubits), device=device, dtype=torch.float32)
                energies = torch.matmul(samples, h.unsqueeze(1)).squeeze()
                counts = samples.sum(dim=1)
                penalty = 2.0 * (counts - max_strategies) ** 2
                energies = energies - penalty
                best_idx = torch.argmax(energies).item()
                if energies[best_idx].item() > best_energy:
                    best_energy = energies[best_idx].item()
                    best_state = int(samples[best_idx].cpu().numpy().dot(
                        [2**i for i in range(n_qubits)]
                    ))

        selected = [strategies[i] for i in range(n_qubits) if (best_state >> i) & 1]
        if len(selected) == 0:
            ranked = sorted(range(n_qubits), key=lambda i: h[i].item(), reverse=True)
            selected = [strategies[i] for i in ranked[:max_strategies]]
        if len(selected) > max_strategies:
            util_map = {strategies[i]: h[i].item() for i in range(n_qubits)}
            selected = sorted(selected, key=lambda s: util_map.get(s, 0), reverse=True)[:max_strategies]

        weights = {}
        sel_indices = [strategies.index(s) for s in selected]
        total_util = sum(max(0.01, h[i].item() + 1) for i in sel_indices)
        for s in selected:
            i = strategies.index(s)
            weights[s] = max(0.03, (h[i].item() + 1) / total_util)
        for s in strategies:
            if s not in weights:
                weights[s] = 0.03
        w_total = sum(weights.values())
        weights = {k: round(v / w_total, 4) for k, v in weights.items()}

        elapsed_ms = (time.perf_counter() - t0) * 1000
        stats["total_compute_ms"] += elapsed_ms
        logger.info(f"QAOA: {n} strategies, {n_iterations} iters in {elapsed_ms:.1f}ms -> {selected}")

        return {
            "selectedStrategies": selected,
            "weights": weights,
            "expectedUtility": round(best_energy, 4),
            "convergence": {
                "iterations": n_iterations,
                "layers": n_layers,
                "finalEnergy": round(best_energy, 4),
            },
            "computeTimeMs": round(elapsed_ms, 2),
            "backend": BACKEND,
        }

    except Exception as e:
        stats["errors"] += 1
        logger.error(f"QAOA error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 
# VQC  Regime Classification (CUDA)
# 

@app.post("/gpu/vqc-regime")
async def gpu_vqc(body: dict):
    """Classify market regime using GPU-accelerated neural inference."""
    if device is None:
        raise HTTPException(status_code=503, detail="PyTorch not available")
    if not GPU_AVAILABLE:
        logger.warning("VQC running on CPU — install CUDA PyTorch for GPU acceleration")

    stats["requests"]["vqc"] += 1
    t0 = time.perf_counter()

    try:
        features = body.get("features", [0] * 8)
        if not isinstance(features, list):
            features = list(features)
        # PATCH #139: Sanitize None/NaN values (JS NaN → JSON null → Python None)
        features = [float(f) if f is not None and f == f else 0.0 for f in features]

        with torch.no_grad():
            x = torch.tensor(features, dtype=torch.float32, device=device)
            # Contract aligned with HybridQuantumClassicalPipeline:
            # [mu, sigma, latest, zscore, upRatio, maxAbs, momentum5, correlation]
            mean_return = x[0].item() if len(x) > 0 else 0.0
            vol = abs(x[1].item()) if len(x) > 1 else 0.5
            latest = x[2].item() if len(x) > 2 else 0.0
            momentum = x[6].item() if len(x) > 6 else 0
            z_score = x[3].item() if len(x) > 3 else 0
            up_ratio = x[4].item() if len(x) > 4 else 0.5
            max_abs_return = abs(x[5].item()) if len(x) > 5 else 0.0

            regimes = ['TRENDING_UP', 'TRENDING_DOWN', 'RANGING', 'HIGH_VOLATILITY']
            scores = torch.zeros(4, device=device)
            directional_bias = abs(up_ratio - 0.5) * 2.0 + abs(mean_return) * 3.5

            # Stage 2 model tuning:
            # - Penalize false-positive HIGH_VOLATILITY on quiet directional or balanced windows
            # - Preserve ranging as the default low-conviction state
            # - Add a targeted quiet-trend override for low-vol trend continuation windows
            scores[0] = (
                max(0, momentum) * 2.2
                + max(0, z_score) * 0.45
                + max(0, up_ratio - 0.52) * 2.4
                + max(0, mean_return) * 2.2
            )
            scores[1] = (
                max(0, -momentum) * 2.2
                + max(0, -z_score) * 0.45
                + max(0, 0.48 - up_ratio) * 2.4
                + max(0, -mean_return) * 2.2
            )
            scores[2] = (
                (1 - abs(momentum)) * 1.35
                + max(0, 0.52 - vol) * 0.35
                + max(0, 0.10 - abs(mean_return)) * 0.35
                - directional_bias
            )
            scores[3] = (
                max(0, vol - 0.5) * 3.2
                + max(0, max_abs_return - 0.92) * 0.8
                + max(0, abs(z_score) - 0.95) * 0.6
            )

            probs = torch.softmax(scores, dim=0).cpu().tolist()
            regime_idx = torch.argmax(scores).item()
            regime = regimes[regime_idx]

            if regime in ('RANGING', 'HIGH_VOLATILITY'):
                if mean_return > 0.04 and up_ratio > 0.54 and vol < 0.55 and z_score > -0.5:
                    regime = 'TRENDING_UP'
                elif mean_return < -0.05 and up_ratio < 0.44 and vol < 0.55 and z_score < -0.35:
                    regime = 'TRENDING_DOWN'

            regime_confidence = probs[regimes.index(regime)] if regime in regimes else max(probs)

        elapsed_ms = (time.perf_counter() - t0) * 1000
        stats["total_compute_ms"] += elapsed_ms

        return {
            "regime": regime,
            "confidence": round(regime_confidence, 4),
            "probabilities": {regimes[i]: round(p, 4) for i, p in enumerate(probs)},
            "computeTimeMs": round(elapsed_ms, 2),
            "backend": BACKEND,
        }

    except Exception as e:
        stats["errors"] += 1
        logger.error(f"VQC error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 
# MATMUL  GPU Matrix Multiplication
# 

@app.post("/gpu/matmul")
async def gpu_matmul(body: dict):
    """GPU-accelerated matrix multiplication."""
    if device is None:
        raise HTTPException(status_code=503, detail="PyTorch not available")
    if not GPU_AVAILABLE:
        logger.warning("MatMul running on CPU — install CUDA PyTorch for GPU acceleration")

    stats["requests"]["matmul"] += 1
    t0 = time.perf_counter()

    try:
        mat_a = body.get("matA", [[1]])
        mat_b = body.get("matB", [[1]])

        with torch.no_grad():
            a = torch.tensor(mat_a, dtype=torch.float32, device=device)
            b = torch.tensor(mat_b, dtype=torch.float32, device=device)
            result = torch.matmul(a, b).cpu().tolist()

        elapsed_ms = (time.perf_counter() - t0) * 1000
        stats["total_compute_ms"] += elapsed_ms

        return {
            "result": result,
            "computeTimeMs": round(elapsed_ms, 2),
            "backend": BACKEND,
        }

    except Exception as e:
        stats["errors"] += 1
        logger.error(f"MatMul error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 
# VAR  GPU Value at Risk Calculation
# 

@app.post("/gpu/var")
async def gpu_var(body: dict):
    """GPU-accelerated VaR/CVaR calculation."""
    if device is None:
        raise HTTPException(status_code=503, detail="PyTorch not available")
    if not GPU_AVAILABLE:
        logger.warning("VaR running on CPU — install CUDA PyTorch for GPU acceleration")

    stats["requests"]["var"] += 1
    t0 = time.perf_counter()

    try:
        pnl = body.get("pnlDistribution", [])
        confidence_levels = body.get("confidenceLevels", [0.95, 0.99])

        if not pnl or len(pnl) < 10:
            return {"error": "Need at least 10 PnL observations"}

        with torch.no_grad():
            pnl_tensor = torch.tensor(pnl, dtype=torch.float32, device=device)
            sorted_pnl, _ = torch.sort(pnl_tensor)
            n = len(pnl)

            results = {}
            for cl in confidence_levels:
                idx = int(n * (1 - cl))
                var_val = sorted_pnl[idx].item()
                tail = sorted_pnl[:max(1, idx)]
                cvar_val = tail.mean().item()
                results[f"VaR_{int(cl*100)}"] = round(var_val, 6)
                results[f"CVaR_{int(cl*100)}"] = round(cvar_val, 6)

        elapsed_ms = (time.perf_counter() - t0) * 1000
        stats["total_compute_ms"] += elapsed_ms

        return {
            "riskMetrics": results,
            "nObservations": n,
            "computeTimeMs": round(elapsed_ms, 2),
            "backend": BACKEND,
        }

    except Exception as e:
        stats["errors"] += 1
        logger.error(f"VaR error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 
# STARTUP
# 

if __name__ == "__main__":
    port = int(os.environ.get("GPU_PORT", 4000))
    print(f"\n{'='*60}")
    print(f"  TURBO-BOT GPU CUDA SERVICE")
    print(f"  PATCH #43: GPU-ONLY Architecture")
    print(f"  Version: {SERVICE_VERSION}")
    print(f"  Port: {port}")
    if GPU_AVAILABLE:
        print(f"  GPU: {gpu_name}")
        print(f"  VRAM: {vram_total:.1f} GB (limit: 40% = {vram_total*0.4:.1f} GB)")
    else:
        print(f"  GPU: NOT AVAILABLE — CPU fallback active")
        if GPU_INIT_ERROR:
            print(f"  Init error: {GPU_INIT_ERROR}")
    print(f"{'='*60}\n")

    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
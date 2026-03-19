#!/usr/bin/env python3
"""
PATCH #43/#178/#179: GPU-ONLY CUDA Service  RTX 5070 Ti @ 60% Utilization

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
  POST /gpu/xgboost-train XGBoost classifier+regressor GPU training (P#178)
  POST /gpu/xgboost-predict XGBoost batch prediction (P#179)
  POST /gpu/mlp-train     PyTorch MLP GPU training (P#178)

Requirements:
  pip install torch fastapi uvicorn pynvml xgboost numpy

Usage:
  python gpu-cuda-service.py
  # Runs on http://0.0.0.0:4000
"""

import os
import sys
import time
import math
import json
import logging
import traceback
import base64
import io
from typing import Optional, List, Dict, Any

#  FastAPI 
try:
    from fastapi import FastAPI, HTTPException
    from fastapi.responses import JSONResponse
    import uvicorn
except ImportError:
    print("ERROR: FastAPI not installed. Run: pip install fastapi uvicorn")
    exit(1)

#  PyTorch CUDA — GPU ONLY, NO CPU FALLBACK 
GPU_AVAILABLE = False
GPU_INIT_ERROR = None
device = None
gpu_name = "N/A"
vram_total = 0
BACKEND = "N/A"

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
        print("  ❌ FATAL: CUDA NOT AVAILABLE — SERVICE WILL NOT START")
        print("  ❌ This service requires a CUDA-capable GPU. No CPU fallback.")
        print("")
        if 'cpu' in (torch.version.cuda or 'cpu').lower() or torch.version.cuda is None:
            print("  FIX: You have PyTorch CPU-only build installed.")
            print("  Run this command to install PyTorch with CUDA:")
            print("")
            print("    pip install torch --index-url https://download.pytorch.org/whl/cu128")
            print("")
        else:
            print(f"  PyTorch CUDA build: {torch.version.cuda}")
            print("  But CUDA runtime not detected. Check NVIDIA drivers.")
            print("  Run: nvidia-smi")
        print("=" * 70)
        print("")
        GPU_INIT_ERROR = "CUDA not available — no CPU fallback allowed"
        # DO NOT set device — service will refuse to start
    else:
        GPU_AVAILABLE = True
        #  40% GPU memory limit 
        torch.cuda.set_per_process_memory_fraction(0.6, 0)
        device = torch.device('cuda:0')
        gpu_name = torch.cuda.get_device_name(0)
        vram_total = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        BACKEND = "cuda"
        print(f"")
        print(f"  ✅ GPU ACTIVE: {gpu_name}")
        print(f"  ✅ VRAM: {vram_total:.1f} GB | Limit: 60% ({vram_total*0.6:.1f} GB)")
        print(f"")
except Exception as init_error:
    GPU_AVAILABLE = False
    GPU_INIT_ERROR = str(init_error)
    device = None
    BACKEND = "N/A"
    print(f"❌ FATAL: CUDA initialization failed: {GPU_INIT_ERROR}")
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
SERVICE_VERSION = "2.0.0-ML-GPU"

app = FastAPI(title="Turbo-Bot GPU Service", version=SERVICE_VERSION)

# Stats tracking
stats = {
    "start_time": time.time(),
    "requests": {"qmc": 0, "qaoa": 0, "vqc": 0, "matmul": 0, "var": 0,
                 "xgb_train": 0, "xgb_predict": 0, "mlp_train": 0, "mlp_predict": 0},
    "total_compute_ms": 0,
    "errors": 0,
}

#  XGBoost (optional — for remote ML training) 
try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False


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
        "memory_limit_pct": 60,
    }
    if GPU_AVAILABLE:
        info["vram_used_gb"] = round(torch.cuda.memory_allocated(0) / (1024**3), 3)
        info["vram_free_gb"] = round((vram_total * 0.6) - info["vram_used_gb"], 3)
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
        "status": "online" if GPU_AVAILABLE else "degraded",
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
    if not GPU_AVAILABLE:
        raise HTTPException(status_code=503, detail="GPU not available — no CPU fallback")

    stats["requests"]["qmc"] += 1
    t0 = time.perf_counter()

    try:
        n_paths = min(int(body.get("nPaths", 8000)), 1000000)  # P#192: cap 500K→1M
        n_steps = min(int(body.get("nSteps", 5)), 512)  # P#192: cap 252→512
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
            final_prices_tensor = current_price * torch.exp(final_log_returns)

            # P#193.2: Compute summary stats on GPU — avoid serializing 500K floats
            summary_only = bool(body.get("summaryOnly", False))
            if summary_only:
                prob_positive = float((final_prices_tensor > current_price).float().mean().item())
                sorted_prices, _ = torch.sort(final_prices_tensor)
                idx_5pct = max(0, int(n_paths * 0.05) - 1)
                var_5pct = round(1.0 - float(sorted_prices[idx_5pct].item()), 6)
                mean_price = float(final_prices_tensor.mean().item())
                final_prices_list = []  # Don't serialize
            else:
                final_prices_list = final_prices_tensor.cpu().tolist()
                prob_positive = None
                var_5pct = None
                mean_price = None

        elapsed_ms = (time.perf_counter() - t0) * 1000
        stats["total_compute_ms"] += elapsed_ms
        logger.info(f"QMC: {n_paths} paths x {n_steps} steps in {elapsed_ms:.1f}ms (summary={summary_only})")

        result = {
            "pathsGenerated": n_paths,
            "nSteps": n_steps,
            "computeTimeMs": round(elapsed_ms, 2),
            "backend": BACKEND,
            "device": gpu_name if GPU_AVAILABLE else "cpu",
        }
        if summary_only:
            result["probPositive"] = round(prob_positive, 6)
            result["var5pct"] = var_5pct
            result["meanPrice"] = round(mean_price, 6)
        else:
            result["finalPrices"] = final_prices_list
        return result

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
        raise HTTPException(status_code=503, detail="GPU not available — no CPU fallback")

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
        n_layers = min(int(body.get("layers", 4)), 12)
        n_iterations = min(int(body.get("iterations", 200)), 8192)  # P#192: cap 4096→8192

        h = torch.zeros(n_qubits, device=device)
        for i in range(n_qubits):
            m = strategy_metrics.get(strategies[i], {})
            h[i] = float(m.get("sharpe", 0)) * 0.5 - float(m.get("risk", 0.5)) * 0.3 + float(m.get("returns", 0)) * 0.2

        best_energy = float('-inf')
        best_state = 0
        n_samples = min(int(body.get("samples", 4096)), 131072)  # P#192: cap 65K→131K

        with torch.no_grad():
            # P#192: Vectorized QAOA with VRAM-safe chunking
            # Each chunk: chunk_iters × n_samples × n_qubits × 4 bytes
            # Target ~1GB per chunk to stay within VRAM limit
            max_elements_per_chunk = 256 * 1024 * 1024 // 4  # ~256M float32 = ~1GB
            elements_per_iter = n_samples * n_qubits
            chunk_iters = max(1, min(n_iterations, max_elements_per_chunk // max(elements_per_iter, 1)))

            best_energy = float('-inf')
            best_state = 0

            for chunk_start in range(0, n_iterations, chunk_iters):
                chunk_size = min(chunk_iters, n_iterations - chunk_start)
                samples = torch.randint(0, 2, (chunk_size, n_samples, n_qubits),
                                        device=device, dtype=torch.float32)
                energies = torch.matmul(samples, h.unsqueeze(1)).squeeze(-1)
                counts = samples.sum(dim=2)
                penalties = 2.0 * (counts - max_strategies) ** 2
                energies = energies - penalties
                flat_energies = energies.reshape(-1)
                best_flat_idx = torch.argmax(flat_energies).item()
                chunk_best_energy = flat_energies[best_flat_idx].item()
                if chunk_best_energy > best_energy:
                    best_energy = chunk_best_energy
                    iter_idx = best_flat_idx // n_samples
                    sample_idx = best_flat_idx % n_samples
                    best_sample = samples[iter_idx, sample_idx]
                    best_state = int(best_sample.cpu().numpy().dot(
                        [2**i for i in range(n_qubits)]
                    ))
                del samples, energies, counts, penalties, flat_energies

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
        raise HTTPException(status_code=503, detail="GPU not available — no CPU fallback")

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


# ═══════════════════════════════════════════════════════════════════
# BATCH QUANTUM — process N×(QMC+VQC+QAOA) in one HTTP call (P#192)
# ═══════════════════════════════════════════════════════════════════

@app.post("/gpu/batch-quantum")
async def gpu_batch_quantum(body: dict):
    """
    Batch quantum endpoint: process multiple QMC, VQC, QAOA calls in one HTTP round-trip.
    Request: { "ops": [ {"type": "qmc", ...}, {"type": "vqc", ...}, {"type": "qaoa", ...} ] }
    Response: { "results": [ {qmc_result}, {vqc_result}, {qaoa_result} ], "total_ms": ... }
    """
    if not GPU_AVAILABLE:
        raise HTTPException(status_code=503, detail="GPU not available")

    t0 = time.perf_counter()
    ops = body.get("ops", [])
    if not ops or len(ops) > 50:
        raise HTTPException(status_code=400, detail=f"ops must be 1-50 items, got {len(ops)}")

    results = []
    for op in ops:
        op_type = op.get("type", "").lower()
        try:
            if op_type == "qmc":
                result = await gpu_qmc(op)
            elif op_type == "vqc":
                result = await gpu_vqc(op)
            elif op_type == "qaoa":
                result = await gpu_qaoa(op)
            else:
                result = {"error": f"unknown op type: {op_type}"}
        except HTTPException as he:
            result = {"error": he.detail}
        except Exception as e:
            result = {"error": str(e)}
        results.append(result)

    elapsed_ms = (time.perf_counter() - t0) * 1000
    stats["requests"]["batch_quantum"] = stats["requests"].get("batch_quantum", 0) + 1
    stats["total_compute_ms"] += elapsed_ms
    logger.info(f"BATCH-QUANTUM: {len(ops)} ops in {elapsed_ms:.1f}ms")

    return {
        "results": results,
        "n_ops": len(ops),
        "total_ms": round(elapsed_ms, 2),
        "backend": BACKEND,
    }


# 
# MATMUL  GPU Matrix Multiplication
# 

@app.post("/gpu/matmul")
async def gpu_matmul(body: dict):
    """GPU-accelerated matrix multiplication."""
    if device is None:
        raise HTTPException(status_code=503, detail="PyTorch not available")
    if not GPU_AVAILABLE:
        raise HTTPException(status_code=503, detail="GPU not available — no CPU fallback")

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
        raise HTTPException(status_code=503, detail="GPU not available — no CPU fallback")

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


# ═══════════════════════════════════════════════════════════════════
# XGBOOST TRAIN — GPU-accelerated XGBoost training (P#178)
# ═══════════════════════════════════════════════════════════════════

# Server-side model store for XGBoost (keyed by symbol)
# P#182: MLP model store for GPU-side prediction
_mlp_models: dict = {}  # { symbol: {'model': nn.Module, 'mean': ndarray, 'std': ndarray} }
_xgb_models: dict = {}  # { symbol: {'clf': Booster, 'reg': Booster} }

@app.post("/gpu/xgboost-train")
async def gpu_xgboost_train(body: dict):
    """
    Train XGBoost classifier + regressor on GPU.
    Returns serialized model bytes + CV scores.

    Request: { X: [[...]], y_dir: [...], y_ret: [...], clf_params: {}, reg_params: {}, cv_splits: 3, symbol: "BTCUSDT" }
    Response: { clf_model_b64, reg_model_b64, cv_scores, up_ratio, training_ms, backend }
    """
    if not HAS_XGBOOST:
        raise HTTPException(status_code=503, detail="XGBoost not installed on GPU service")
    if not HAS_NUMPY:
        raise HTTPException(status_code=503, detail="NumPy not installed on GPU service")

    stats["requests"]["xgb_train"] += 1
    t0 = time.perf_counter()

    try:
        X = np.array(body['X'], dtype=np.float32)
        y_dir = np.array(body['y_dir'], dtype=np.int32)
        y_ret = np.array(body.get('y_ret', []), dtype=np.float32)
        clf_params = body.get('clf_params', {})
        reg_params = body.get('reg_params', {})
        cv_splits = int(body.get('cv_splits', 3))
        symbol = body.get('symbol', 'UNKNOWN')

        if not GPU_AVAILABLE:
            raise HTTPException(status_code=503, detail="GPU not available — no CPU fallback")
        xgb_device = 'cuda'
        n_samples, n_features = X.shape

        # --- Cross-validation ---
        cv_scores = []
        if cv_splits > 0 and n_samples >= 100:
            fold_size = n_samples // (cv_splits + 1)
            for i in range(cv_splits):
                train_end = fold_size * (i + 1)
                val_start = train_end
                val_end = min(val_start + fold_size, n_samples)
                if val_end <= val_start:
                    continue
                X_tr, X_val = X[:train_end], X[val_start:val_end]
                y_tr, y_val = y_dir[:train_end], y_dir[val_start:val_end]

                fold_clf = xgb.XGBClassifier(
                    device=xgb_device, tree_method='hist',
                    eval_metric='logloss', random_state=42,
                    **clf_params,
                )
                fold_clf.fit(X_tr, y_tr)
                preds = fold_clf.predict(X_val)
                acc = float(np.mean(preds == y_val))
                cv_scores.append(acc)

        # --- Final training on all data ---
        clf = xgb.XGBClassifier(
            device=xgb_device, tree_method='hist',
            eval_metric='logloss', random_state=42,
            **clf_params,
        )
        clf.fit(X, y_dir)

        reg = None
        if len(y_ret) > 0:
            reg = xgb.XGBRegressor(
                device=xgb_device, tree_method='hist', random_state=42,
                **reg_params,
            )
            reg.fit(X, y_ret)

        # --- Serialize models (full XGBClassifier format for classes_ compat) ---
        import tempfile as _tf
        clf_tmp = _tf.mktemp(suffix='.ubj')
        clf.save_model(clf_tmp)
        with open(clf_tmp, 'rb') as fh:
            clf_raw = fh.read()
        try:
            os.unlink(clf_tmp)
        except OSError:
            pass
        if reg:
            reg_tmp = _tf.mktemp(suffix='.ubj')
            reg.save_model(reg_tmp)
            with open(reg_tmp, 'rb') as fh:
                reg_raw = fh.read()
            try:
                os.unlink(reg_tmp)
            except OSError:
                pass
        else:
            reg_raw = b''

        # Store server-side for potential batch predict
        _xgb_models[symbol] = {'clf': clf, 'reg': reg}

        # Feature importance
        imp = clf.feature_importances_
        top_importance = sorted(enumerate(imp.tolist()), key=lambda x: -x[1])[:10]

        elapsed_ms = (time.perf_counter() - t0) * 1000
        stats["total_compute_ms"] += elapsed_ms
        up_ratio = float(np.mean(y_dir == 1))

        logger.info(f"XGB-TRAIN [{symbol}]: {n_samples}x{n_features} in {elapsed_ms:.0f}ms "
                    f"CV={[round(s,3) for s in cv_scores]} device={xgb_device}")

        return {
            "clf_model_b64": base64.b64encode(clf_raw).decode(),
            "reg_model_b64": base64.b64encode(reg_raw).decode() if reg_raw else None,
            "cv_scores": [round(s, 4) for s in cv_scores],
            "up_ratio": round(up_ratio, 4),
            "n_trained": n_samples,
            "n_features": n_features,
            "top_importance": top_importance,
            "training_ms": round(elapsed_ms, 2),
            "backend": BACKEND,
            "xgb_device": xgb_device,
        }

    except Exception as e:
        stats["errors"] += 1
        logger.error(f"XGB-TRAIN error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════
# XGBOOST PREDICT — GPU-accelerated batch prediction (P#179)
# ═══════════════════════════════════════════════════════════════════

@app.post("/gpu/xgboost-predict")
async def gpu_xgboost_predict(body: dict):
    """
    Batch XGBoost prediction on GPU using server-side stored model.
    Request: { symbol: "BTCUSDT", X: [[...], [...]], feature_names: [...] }
    Response: { predictions: [{action, confidence, proba_up, proba_down, expected_return}] }
    """
    if not HAS_XGBOOST or not HAS_NUMPY:
        raise HTTPException(status_code=503, detail="XGBoost/NumPy not available")

    symbol = body.get('symbol', 'UNKNOWN')
    models = _xgb_models.get(symbol)
    if not models or not models.get('clf'):
        raise HTTPException(status_code=404, detail=f"No trained model for {symbol}")

    t0 = time.perf_counter()
    try:
        X = np.array(body['X'], dtype=np.float32)
        feature_names = body.get('feature_names', [f'f{i}' for i in range(X.shape[1])])

        clf = models['clf']
        reg = models.get('reg')

        # Batch predict
        if hasattr(clf, 'predict_proba'):
            probas = clf.predict_proba(X)
            proba_up = probas[:, 1].tolist()
            proba_down = probas[:, 0].tolist()
        else:
            dmat = xgb.DMatrix(X, feature_names=feature_names)
            raw = clf.get_booster().predict(dmat) if hasattr(clf, 'get_booster') else clf.predict(dmat)
            proba_up = raw.tolist()
            proba_down = (1 - raw).tolist()

        expected_returns = []
        if reg is not None:
            if hasattr(reg, 'predict'):
                expected_returns = reg.predict(X).tolist()
            else:
                dmat = xgb.DMatrix(X, feature_names=feature_names)
                expected_returns = reg.predict(dmat).tolist()

        elapsed_ms = (time.perf_counter() - t0) * 1000
        logger.info(f"XGB-PREDICT [{symbol}]: {len(X)} samples in {elapsed_ms:.1f}ms")

        return {
            "proba_up": proba_up,
            "proba_down": proba_down,
            "expected_returns": expected_returns,
            "n_samples": len(X),
            "predict_ms": round(elapsed_ms, 2),
            "backend": BACKEND,
        }

    except Exception as e:
        stats["errors"] += 1
        logger.error(f"XGB-PREDICT error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════
# MLP TRAIN — GPU-accelerated PyTorch MLP training (P#178)
# ═══════════════════════════════════════════════════════════════════

@app.post("/gpu/mlp-train")
async def gpu_mlp_train(body: dict):
    """
    Train PyTorch MLP (3-layer) on GPU.
    Returns serialized state_dict + normalization params.

    Request: { X: [[...]], y_dir: [...], y_ret: [...], hidden: [128,64,32], lr, epochs, batch_size, ... }
    Response: { state_dict (per-tensor), mean_b64, std_b64, val_accuracy, epochs_used, training_ms, backend }
    """
    if device is None:
        raise HTTPException(status_code=503, detail="PyTorch not available")

    stats["requests"]["mlp_train"] += 1
    t0 = time.perf_counter()

    try:
        X = np.array(body['X'], dtype=np.float32) if HAS_NUMPY else torch.tensor(body['X']).numpy()
        y_dir = np.array(body['y_dir'], dtype=np.int64) if HAS_NUMPY else torch.tensor(body['y_dir']).numpy()
        y_ret = np.array(body.get('y_ret', []), dtype=np.float32) if HAS_NUMPY else torch.tensor(body.get('y_ret', [])).numpy()

        hidden = body.get('hidden', [128, 64, 32])
        lr = float(body.get('lr', 1e-3))
        epochs = int(body.get('epochs', 80))
        batch_size = int(body.get('batch_size', 64))
        weight_decay = float(body.get('weight_decay', 1e-4))
        patience = int(body.get('patience', 10))
        dropout = float(body.get('dropout', 0.3))
        symbol = body.get('symbol', 'UNKNOWN')

        n_samples, n_features = X.shape

        # Normalize
        mean = X.mean(axis=0)
        std = X.std(axis=0)
        X_norm = (X - mean) / (std + 1e-8)

        # Train/val split (time-ordered 80/20)
        split = int(len(X_norm) * 0.8)
        X_train, X_val = X_norm[:split], X_norm[split:]
        y_dir_train, y_dir_val = y_dir[:split], y_dir[split:]
        y_ret_train, y_ret_val = y_ret[:split] if len(y_ret) > 0 else np.array([]), y_ret[split:] if len(y_ret) > 0 else np.array([])

        # Build model (same arch as TorchMLPEngine)
        import torch.nn as nn
        shared = nn.Sequential(
            nn.Linear(n_features, hidden[0]),
            nn.BatchNorm1d(hidden[0]),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden[0], hidden[1]),
            nn.BatchNorm1d(hidden[1]),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden[1], hidden[2]),
            nn.BatchNorm1d(hidden[2]),
            nn.ReLU(),
        )
        clf_head = nn.Linear(hidden[2], 2)
        reg_head = nn.Linear(hidden[2], 1)

        model = nn.Sequential()
        model.add_module('shared', shared)

        class _MLPForward(nn.Module):
            def __init__(self, shared, clf_head, reg_head):
                super().__init__()
                self.shared = shared
                self.clf_head = clf_head
                self.reg_head = reg_head
            def forward(self, x):
                h = self.shared(x)
                return self.clf_head(h), self.reg_head(h).squeeze(-1)

        model = _MLPForward(shared, clf_head, reg_head).to(device)

        # To GPU tensors
        X_t = torch.tensor(X_train, dtype=torch.float32, device=device)
        y_d_t = torch.tensor(y_dir_train, dtype=torch.long, device=device)
        y_r_t = torch.tensor(y_ret_train, dtype=torch.float32, device=device) if len(y_ret_train) > 0 else None
        X_v = torch.tensor(X_val, dtype=torch.float32, device=device)
        y_d_v = torch.tensor(y_dir_val, dtype=torch.long, device=device)

        optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5, factor=0.5)
        clf_loss_fn = nn.CrossEntropyLoss()
        reg_loss_fn = nn.MSELoss()

        best_val_loss = float('inf')
        patience_counter = 0
        best_state = None
        val_acc = 0.0

        for epoch in range(epochs):
            model.train()
            perm = torch.randperm(len(X_t), device=device)
            for start in range(0, len(X_t), batch_size):
                idx = perm[start:start + batch_size]
                if len(idx) < 2:
                    continue
                logits, ret_pred = model(X_t[idx])
                loss = clf_loss_fn(logits, y_d_t[idx])
                if y_r_t is not None:
                    loss = loss + 0.5 * reg_loss_fn(ret_pred, y_r_t[idx])
                optimizer.zero_grad()
                loss.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()

            model.eval()
            with torch.no_grad():
                val_logits, val_ret = model(X_v)
                val_loss = clf_loss_fn(val_logits, y_d_v).item()
                val_acc = (val_logits.argmax(dim=1) == y_d_v).float().mean().item()
            scheduler.step(val_loss)

            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_counter = 0
                best_state = {k: v.clone() for k, v in model.state_dict().items()}
            else:
                patience_counter += 1
                if patience_counter >= patience:
                    break

        if best_state is not None:
            model.load_state_dict(best_state)
        model.eval()
        epochs_used = epoch + 1

        # Serialize state_dict as {key: {data_b64, shape, dtype}}
        sd_serialized = {}
        for key, tensor in model.state_dict().items():
            arr = tensor.cpu().numpy()
            sd_serialized[key] = {
                'data_b64': base64.b64encode(arr.tobytes()).decode(),
                'shape': list(arr.shape),
                'dtype': str(arr.dtype),
            }

        # Serialize normalization params
        mean_b64 = base64.b64encode(mean.astype(np.float32).tobytes()).decode() if HAS_NUMPY else None
        std_b64 = base64.b64encode(std.astype(np.float32).tobytes()).decode() if HAS_NUMPY else None

        elapsed_ms = (time.perf_counter() - t0) * 1000
        stats["total_compute_ms"] += elapsed_ms
        up_ratio = float(np.mean(y_dir == 1)) if HAS_NUMPY else 0

        # P#182: Store model server-side for GPU-accelerated prediction
        _mlp_models[symbol] = {
            'model': model,  # stays on GPU device
            'mean': mean if HAS_NUMPY else None,
            'std': std if HAS_NUMPY else None,
        }

        logger.info(f"MLP-TRAIN [{symbol}]: {n_samples}x{n_features} → {epochs_used} epochs, "
                    f"val_acc={val_acc:.3f} in {elapsed_ms:.0f}ms device={device}")

        return {
            "state_dict": sd_serialized,
            "mean_b64": mean_b64,
            "std_b64": std_b64,
            "val_accuracy": round(val_acc, 4),
            "epochs_used": epochs_used,
            "n_trained": n_samples,
            "n_features": n_features,
            "up_ratio": round(up_ratio, 4),
            "training_ms": round(elapsed_ms, 2),
            "backend": BACKEND,
        }

    except Exception as e:
        stats["errors"] += 1
        logger.error(f"MLP-TRAIN error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════
# MLP PREDICT — GPU-accelerated PyTorch MLP prediction (P#182)
# ═══════════════════════════════════════════════════════════════════

@app.post("/gpu/mlp-predict")
async def gpu_mlp_predict(body: dict):
    """
    Batch MLP prediction on GPU using server-side stored model.
    Request: { symbol: "BTCUSDT", X: [[...]], use_normalization: true }
    Response: { proba_up, proba_down, expected_returns, predict_ms, backend }
    """
    if device is None:
        raise HTTPException(status_code=503, detail="PyTorch not available")

    symbol = body.get('symbol', 'UNKNOWN')
    models = _mlp_models.get(symbol)
    if not models or not models.get('model'):
        raise HTTPException(status_code=404, detail=f"No trained MLP model for {symbol}")

    t0 = time.perf_counter()
    try:
        X = np.array(body['X'], dtype=np.float32) if HAS_NUMPY else None
        if X is None:
            raise HTTPException(status_code=503, detail="NumPy not available")

        model = models['model']
        mean = models.get('mean')
        std = models.get('std')

        # Normalize if normalization params available
        if mean is not None and std is not None and body.get('use_normalization', True):
            X = (X - mean) / (std + 1e-8)

        model.eval()
        with torch.no_grad():
            X_t = torch.tensor(X, dtype=torch.float32, device=device)
            logits, ret_pred = model(X_t)
            proba = torch.softmax(logits, dim=1).cpu().numpy()
            expected_returns = ret_pred.cpu().numpy().tolist()

        elapsed_ms = (time.perf_counter() - t0) * 1000
        logger.info(f"MLP-PREDICT [{symbol}]: {len(X)} samples in {elapsed_ms:.1f}ms")

        return {
            "proba_up": proba[:, 1].tolist(),
            "proba_down": proba[:, 0].tolist(),
            "expected_returns": expected_returns,
            "n_samples": len(X),
            "predict_ms": round(elapsed_ms, 2),
            "backend": BACKEND,
        }

    except HTTPException:
        raise
    except Exception as e:
        stats["errors"] += 1
        logger.error(f"MLP-PREDICT error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 
# STARTUP
# 

if __name__ == "__main__":
    port = int(os.environ.get("GPU_PORT", 4001))  # 4001 avoids Windows AV DPI on 4000
    print(f"\n{'='*60}")
    print(f"  TURBO-BOT GPU CUDA SERVICE")
    print(f"  PATCH #43: GPU-ONLY Architecture")
    print(f"  Version: {SERVICE_VERSION}")
    print(f"  Port: {port}")
    if not GPU_AVAILABLE:
        print(f"  ❌ GPU: NOT AVAILABLE")
        if GPU_INIT_ERROR:
            print(f"  ❌ Error: {GPU_INIT_ERROR}")
        print(f"{'='*60}")
        print(f"")
        print(f"  SERVICE REFUSED TO START — GPU IS REQUIRED")
        print(f"  Fix: pip install torch --index-url https://download.pytorch.org/whl/cu128")
        print(f"  Then: nvidia-smi (check driver)")
        print(f"")
        sys.exit(1)

    print(f"  GPU: {gpu_name}")
    print(f"  VRAM: {vram_total:.1f} GB (limit: 60% = {vram_total*0.6:.1f} GB)")
    print(f"{'='*60}\n")

    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
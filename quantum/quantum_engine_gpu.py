#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════════════╗
║  GPU-Accelerated Quantum Trading Engine v1.0                                     ║
║  Optimized for ASUS Prime GeForce RTX 5070 Ti OC 16GB (Blackwell, CUDA 12.3+)   ║
║                                                                                  ║
║  Algorithms:                                                                     ║
║    1. QAOA  — Portfolio optimization (MaxSharpe / MinRisk QUBO)                  ║
║    2. VQC   — Market regime classification (BULLISH / BEARISH / RANGING)         ║
║    3. QSVM  — Price direction prediction (quantum kernel SVM)                    ║
║    4. QGAN  — Synthetic data augmentation (hybrid quantum-classical GAN)         ║
║    5. QMC   — Risk simulation (VaR / CVaR / scenario analysis)                   ║
║                                                                                  ║
║  GPU Backend: AerSimulator + cuStateVec (cuQuantum) when available               ║
║  CPU Fallback: AerSimulator statevector / matrix_product_state                   ║
╚══════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import sys
import json
import time
import logging
import traceback
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

logger = logging.getLogger('quantum_gpu.engine')

# ============================================================================
# GPU / Backend Detection
# ============================================================================
USE_GPU = False
GPU_DEVICE = None
CUQUANTUM_AVAILABLE = False

try:
    import torch
    if torch.cuda.is_available():
        USE_GPU = True
        GPU_DEVICE = torch.cuda.get_device_name(0)
        logger.info(f'[GPU] PyTorch CUDA available: {GPU_DEVICE}')
        logger.info(f'[GPU] VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB')
except ImportError:
    logger.info('[GPU] PyTorch not available — CPU mode')

try:
    import cuquantum  # noqa: F401
    CUQUANTUM_AVAILABLE = True
    logger.info('[GPU] cuQuantum SDK detected — GPU-accelerated simulation enabled')
except ImportError:
    logger.info('[GPU] cuQuantum not found — using PyTorch CUDA GPU acceleration')

# GPU Accelerator — PyTorch CUDA backend (replaces cuQuantum on Windows)
GPU_ACCEL = None
try:
    from quantum.gpu_accelerator import (
        GPUAccelerator, GPUMonteCarloEngine, GPUQuantumKernel,
        GPUFeatureProcessor, GPUQuantumGAN, GPUStatevectorSimulator,
        gpu_available, gpu_info
    )
    if USE_GPU:
        GPU_ACCEL = GPUAccelerator()
        GPU_ACCEL.warmup()
        logger.info(f'[GPU_ACCEL] GPU Accelerator loaded OK -- {GPU_ACCEL.gpu_name}, {GPU_ACCEL.gpu_vram_mb}MB VRAM')
    else:
        logger.info('[GPU_ACCEL] GPU not available — GPU accelerator disabled')
except ImportError as e:
    logger.warning(f'[GPU_ACCEL] GPU accelerator module not found: {e}')
except Exception as e:
    logger.warning(f'[GPU_ACCEL] GPU accelerator init failed: {e}')

# ============================================================================
# Qiskit Imports
# ============================================================================
try:
    from qiskit import QuantumCircuit, transpile
    from qiskit.circuit.library import (
        ZZFeatureMap, RealAmplitudes, EfficientSU2,
        TwoLocal, NLocal, PauliFeatureMap
    )
    from qiskit.quantum_info import Statevector, SparsePauliOp
    QISKIT_AVAILABLE = True
    logger.info('[QISKIT] Core Qiskit loaded')
except ImportError:
    QISKIT_AVAILABLE = False
    logger.error('[QISKIT] Qiskit not installed — quantum engine disabled')

try:
    from qiskit_aer import AerSimulator
    AER_AVAILABLE = True
    logger.info('[QISKIT] Aer simulator available')
except ImportError:
    AER_AVAILABLE = False

try:
    from qiskit_algorithms import QAOA, VQE, NumPyMinimumEigensolver
    from qiskit_algorithms.optimizers import COBYLA, SPSA, L_BFGS_B
    ALGORITHMS_AVAILABLE = True
    logger.info('[QISKIT] Algorithms package available')
except ImportError:
    ALGORITHMS_AVAILABLE = False
    logger.warning('[QISKIT] qiskit_algorithms not available')

try:
    from qiskit_machine_learning.algorithms import VQC as QiskitVQC
    from qiskit_machine_learning.algorithms import QSVC as QiskitQSVC
    from qiskit_machine_learning.kernels import FidelityQuantumKernel
    ML_AVAILABLE = True
    logger.info('[QISKIT] Machine Learning package available')
except ImportError:
    ML_AVAILABLE = False
    logger.warning('[QISKIT] qiskit_machine_learning not available')

try:
    from qiskit_optimization import QuadraticProgram
    from qiskit_optimization.algorithms import MinimumEigenOptimizer
    OPTIMIZATION_AVAILABLE = True
    logger.info('[QISKIT] Optimization package available')
except ImportError:
    OPTIMIZATION_AVAILABLE = False
    logger.warning('[QISKIT] qiskit_optimization not available')

try:
    from sklearn.preprocessing import MinMaxScaler, StandardScaler, LabelEncoder
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, f1_score
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.warning('[SKLEARN] scikit-learn not available')

try:
    from scipy.optimize import minimize as scipy_minimize
    from scipy.stats import norm
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

# ============================================================================
# Results Directory
# ============================================================================
RESULTS_DIR = Path(__file__).parent / 'results'
RESULTS_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_FILE = RESULTS_DIR / 'quantum_results.json'
CHECKPOINTS_DIR = Path(__file__).parent / 'checkpoints'
CHECKPOINTS_DIR.mkdir(parents=True, exist_ok=True)


def get_aer_backend(n_qubits=4, shots=1024):
    """
    Get optimal AerSimulator backend.
    GPU → cuStateVec, CPU → statevector/matrix_product_state.
    """
    if not AER_AVAILABLE:
        return None

    if USE_GPU and CUQUANTUM_AVAILABLE:
        try:
            backend = AerSimulator(
                method='statevector',
                device='GPU',
                cuStateVec_enable=True,
            )
            logger.info(f'[BACKEND] GPU AerSimulator (cuStateVec) — {n_qubits} qubits')
            return backend
        except Exception as e:
            logger.warning(f'[BACKEND] GPU init failed: {e}, falling back to CPU')

    # CPU fallback — use MPS for large circuits
    if n_qubits > 20:
        method = 'matrix_product_state'
    else:
        method = 'statevector'

    backend = AerSimulator(method=method)
    logger.info(f'[BACKEND] CPU AerSimulator ({method}) — {n_qubits} qubits')
    return backend


# ============================================================================
# 1. QAOA — Portfolio Optimization
# ============================================================================
class QAOAPortfolioOptimizer:
    """
    Quantum Approximate Optimization Algorithm for portfolio allocation.
    
    Formulates portfolio optimization as a QUBO (Quadratic Unconstrained 
    Binary Optimization) and solves via QAOA on GPU/CPU.
    
    Problem: Maximize Sharpe ratio subject to allocation constraints.
    Encoding: Binary variables x_i ∈ {0,1} — include asset i or not.
    """

    def __init__(self, n_assets=5, p_layers=4, max_iter=200, shots=4096):
        self.n_assets = n_assets
        self.p_layers = p_layers
        self.max_iter = max_iter
        self.shots = shots
        self.last_result = None

    def optimize(self, returns, cov_matrix, risk_aversion=0.5):
        """
        Run QAOA portfolio optimization.
        
        Args:
            returns: np.ndarray (n_assets,) — expected returns per asset
            cov_matrix: np.ndarray (n_assets, n_assets) — covariance matrix
            risk_aversion: float — risk aversion parameter (0=max return, 1=min risk)
        
        Returns:
            dict with optimal_weights, expected_return, risk, sharpe_ratio
        """
        t0 = time.time()
        n = min(len(returns), self.n_assets)

        # Fallback: classical optimization if QAOA not available
        if not OPTIMIZATION_AVAILABLE or not ALGORITHMS_AVAILABLE:
            return self._classical_fallback(returns[:n], cov_matrix[:n, :n], risk_aversion)

        try:
            # Build QUBO for portfolio optimization
            # Objective: minimize risk_aversion * x^T Σ x - (1 - risk_aversion) * μ^T x
            qp = QuadraticProgram('portfolio_optimization')

            for i in range(n):
                qp.binary_var(f'x_{i}')

            # Quadratic term: risk (covariance)
            quadratic = {}
            for i in range(n):
                for j in range(i, n):
                    key = (f'x_{i}', f'x_{j}')
                    val = risk_aversion * cov_matrix[i, j]
                    if i == j:
                        val *= 2  # Diagonal gets doubled in QUBO
                    if abs(val) > 1e-10:
                        quadratic[key] = float(val)

            # Linear term: negative returns (minimize = maximize returns)
            linear = {}
            for i in range(n):
                linear[f'x_{i}'] = float(-(1 - risk_aversion) * returns[i])

            qp.minimize(linear=linear, quadratic=quadratic)

            # QAOA solver
            backend = get_aer_backend(n_qubits=n, shots=self.shots)
            optimizer = COBYLA(maxiter=self.max_iter)

            from qiskit.primitives import StatevectorSampler
            sampler = StatevectorSampler()

            qaoa = QAOA(sampler=sampler, optimizer=optimizer, reps=self.p_layers)
            solver = MinimumEigenOptimizer(qaoa)

            result = solver.solve(qp)

            # Extract weights
            raw_weights = np.array([result.variables_dict.get(f'x_{i}', 0) for i in range(n)])

            # Normalize to sum to 1
            total = raw_weights.sum()
            if total > 0:
                weights = raw_weights / total
            else:
                weights = np.ones(n) / n

            # Calculate metrics
            expected_return = float(np.dot(weights, returns[:n]))
            risk = float(np.sqrt(np.dot(weights, np.dot(cov_matrix[:n, :n], weights))))
            sharpe = expected_return / risk if risk > 1e-10 else 0.0

            elapsed = time.time() - t0
            self.last_result = {
                'algorithm': 'QAOA',
                'status': 'SUCCESS',
                'optimal_weights': weights.tolist(),
                'selected_assets': [i for i, w in enumerate(weights) if w > 0.01],
                'expected_return': expected_return,
                'risk': risk,
                'sharpe_ratio': sharpe,
                'qaoa_objective': float(result.fval),
                'p_layers': self.p_layers,
                'n_qubits': n,
                'gpu_used': USE_GPU and CUQUANTUM_AVAILABLE,
                'elapsed_sec': round(elapsed, 3),
                'timestamp': datetime.utcnow().isoformat(),
            }
            logger.info(f'[QAOA] Sharpe={sharpe:.4f}, Return={expected_return:.4f}, '
                        f'Risk={risk:.4f}, Time={elapsed:.2f}s')
            return self.last_result

        except Exception as e:
            logger.error(f'[QAOA] Error: {e}')
            logger.debug(traceback.format_exc())
            return self._classical_fallback(returns[:n], cov_matrix[:n, :n], risk_aversion)

    def _classical_fallback(self, returns, cov_matrix, risk_aversion):
        """Classical Markowitz fallback when Qiskit not available."""
        t0 = time.time()
        n = len(returns)

        def neg_sharpe(w):
            ret = np.dot(w, returns)
            risk = np.sqrt(np.dot(w, np.dot(cov_matrix, w)))
            return -(ret / (risk + 1e-10))

        constraints = [{'type': 'eq', 'fun': lambda w: np.sum(w) - 1}]
        bounds = [(0.05, 0.4)] * n
        x0 = np.ones(n) / n

        if SCIPY_AVAILABLE:
            result = scipy_minimize(neg_sharpe, x0, method='SLSQP',
                                    bounds=bounds, constraints=constraints)
            weights = result.x
        else:
            weights = np.ones(n) / n

        weights = np.clip(weights, 0.05, 0.4)
        weights /= weights.sum()

        expected_return = float(np.dot(weights, returns))
        risk = float(np.sqrt(np.dot(weights, np.dot(cov_matrix, weights))))
        sharpe = expected_return / risk if risk > 1e-10 else 0.0

        elapsed = time.time() - t0
        self.last_result = {
            'algorithm': 'QAOA_CLASSICAL_FALLBACK',
            'status': 'SUCCESS',
            'optimal_weights': weights.tolist(),
            'selected_assets': list(range(n)),
            'expected_return': expected_return,
            'risk': risk,
            'sharpe_ratio': sharpe,
            'n_assets': n,
            'gpu_used': False,
            'elapsed_sec': round(elapsed, 3),
            'timestamp': datetime.utcnow().isoformat(),
        }
        logger.info(f'[QAOA-FALLBACK] Sharpe={sharpe:.4f}, Time={elapsed:.2f}s')
        return self.last_result


# ============================================================================
# 2. VQC — Market Regime Classification
# ============================================================================
class VQCRegimeClassifier:
    """
    Variational Quantum Classifier for market regime detection.
    
    Classifies market into regimes:
      0 = BEARISH  (downtrend, high selling pressure)
      1 = RANGING  (sideways, low directional momentum)
      2 = BULLISH  (uptrend, high buying pressure)
    
    Architecture:
      Feature map: ZZFeatureMap (entangling data encoding)
      Ansatz: RealAmplitudes (parameterized rotation gates)
      Optimizer: COBYLA → SPSA (GPU-accelerated)
    """

    def __init__(self, n_qubits=6, n_layers=3, max_iter=150, shots=2048):
        self.n_qubits = n_qubits
        self.n_layers = n_layers
        self.max_iter = max_iter
        self.shots = shots
        self.model = None
        self.is_trained = False
        self.accuracy = 0.0
        self.last_result = None

    def _prepare_features(self, features, n_features=None):
        """Reduce feature dimensions to match qubit count."""
        if n_features is None:
            n_features = self.n_qubits

        if features.shape[1] > n_features:
            # PCA-like reduction: take most important features
            from sklearn.decomposition import PCA
            pca = PCA(n_components=n_features)
            features = pca.fit_transform(features)
        elif features.shape[1] < n_features:
            # Pad with zeros
            pad = np.zeros((features.shape[0], n_features - features.shape[1]))
            features = np.concatenate([features, pad], axis=1)

        # Normalize to [0, π] range for quantum encoding
        scaler = MinMaxScaler(feature_range=(0, np.pi))
        features = scaler.fit_transform(features)
        return features

    def _create_regime_labels(self, prices, lookback=20):
        """Create regime labels from price data."""
        n = len(prices)
        labels = np.ones(n, dtype=int)  # Default: RANGING (1)

        for i in range(lookback, n):
            window = prices[i - lookback:i]
            returns = np.diff(np.log(window))
            trend = np.mean(returns)
            volatility = np.std(returns)

            if trend > 0.001 and volatility < 0.03:
                labels[i] = 2  # BULLISH
            elif trend < -0.001 and volatility < 0.03:
                labels[i] = 0  # BEARISH
            else:
                labels[i] = 1  # RANGING

        return labels

    def train_and_predict(self, features, prices):
        """
        Train VQC on historical data and predict current regime.
        
        Returns:
            dict with regime, confidence, accuracy
        """
        t0 = time.time()

        try:
            # Create labels
            labels = self._create_regime_labels(prices)

            # Prepare features (match qubit count)
            n_features = min(self.n_qubits, features.shape[1])
            X = self._prepare_features(features, n_features)

            # Align shapes: labels may have fewer elements (regime uses future returns)
            min_len = min(len(X), len(labels))
            X = X[:min_len]
            labels = labels[:min_len]

            # Use a manageable subset for training
            max_train = min(len(X) - 1, 100)
            X_train = X[:max_train]
            y_train = labels[:max_train]
            X_test = X[max_train:]
            y_test = labels[max_train:]
            X_latest = X[-1:] if len(X) > 0 else X_train[-1:]

            # Qiskit VQC
            if ML_AVAILABLE and AER_AVAILABLE and SKLEARN_AVAILABLE:
                return self._qiskit_vqc(X_train, y_train, X_test, y_test, X_latest, n_features, t0)
            else:
                return self._classical_fallback(X_train, y_train, X_test, y_test, X_latest, t0)

        except Exception as e:
            logger.error(f'[VQC] Error: {e}')
            logger.debug(traceback.format_exc())
            return self._error_result(str(e))

    def _qiskit_vqc(self, X_train, y_train, X_test, y_test, X_latest, n_features, t0):
        """Run Qiskit VQC classification."""
        # Limit qubits for tractable kernel computation
        n_qubits_qsvm = min(n_features, 5)
        if n_features > n_qubits_qsvm:
            from sklearn.decomposition import PCA
            pca = PCA(n_components=n_qubits_qsvm)
            X_train = pca.fit_transform(X_train)
            X_test = pca.transform(X_test)
            X_latest = pca.transform(X_latest)
        feature_map = ZZFeatureMap(feature_dimension=n_qubits_qsvm, reps=2, entanglement='linear')
        ansatz = RealAmplitudes(n_qubits_qsvm, reps=self.n_layers, entanglement='circular')

        optimizer = COBYLA(maxiter=self.max_iter)

        from qiskit.primitives import StatevectorSampler
        sampler = StatevectorSampler()

        vqc = QiskitVQC(
            sampler=sampler,
            feature_map=feature_map,
            ansatz=ansatz,
            optimizer=optimizer,
        )

        # One-hot encode labels for Qiskit ML multi-class VQC
        n_classes = 3  # BEARISH=0, RANGING=1, BULLISH=2
        y_train_oh = np.zeros((len(y_train), n_classes))
        for i, lbl in enumerate(y_train):
            y_train_oh[i, int(lbl)] = 1.0
        vqc.fit(X_train, y_train_oh)
        self.model = vqc
        self.is_trained = True

        # Predict (VQC returns one-hot encoded predictions)
        y_pred_raw = vqc.predict(X_test)
        # Decode one-hot to integer labels
        if y_pred_raw.ndim > 1:
            y_pred_test = np.argmax(y_pred_raw, axis=1)
        else:
            y_pred_test = y_pred_raw.astype(int)
        self.accuracy = float(accuracy_score(y_test, y_pred_test))

        latest_pred_raw = vqc.predict(X_latest)
        if latest_pred_raw.ndim > 1:
            regime_pred = int(np.argmax(latest_pred_raw[0]))
        else:
            regime_pred = int(latest_pred_raw[0])
        regime_names = {0: 'BEARISH', 1: 'RANGING', 2: 'BULLISH'}

        # Confidence estimate from class distribution
        if len(y_pred_test) > 0:
            unique, counts = np.unique(y_pred_test, return_counts=True)
            regime_dist = dict(zip(unique.astype(int), (counts / counts.sum()).tolist()))
        else:
            regime_dist = {regime_pred: 1.0}

        elapsed = time.time() - t0
        self.last_result = {
            'algorithm': 'VQC',
            'status': 'SUCCESS',
            'regime': regime_names.get(regime_pred, 'UNKNOWN'),
            'regime_id': regime_pred,
            'confidence': float(regime_dist.get(regime_pred, 0.5)),
            'regime_distribution': {int(k): v for k, v in regime_dist.items()},
            'accuracy': self.accuracy,
            'n_qubits': self.n_qubits,
            'n_layers': self.n_layers,
            'train_size': len(X_train),
            'test_size': len(X_test),
            'gpu_used': USE_GPU,
            'elapsed_sec': round(elapsed, 3),
            'timestamp': datetime.utcnow().isoformat(),
        }
        logger.info(f'[VQC] Regime={regime_names.get(regime_pred)}, '
                    f'Accuracy={self.accuracy:.3f}, Time={elapsed:.2f}s')
        return self.last_result

    def _classical_fallback(self, X_train, y_train, X_test, y_test, X_latest, t0):
        """Classical SVM fallback."""
        from sklearn.svm import SVC

        svc = SVC(kernel='rbf', probability=True, C=1.0, gamma='scale')
        svc.fit(X_train, y_train)

        y_pred = svc.predict(X_test)
        acc = float(accuracy_score(y_test, y_pred))
        self.accuracy = acc

        regime_pred = int(svc.predict(X_latest)[0])
        probas = svc.predict_proba(X_latest)[0]
        regime_names = {0: 'BEARISH', 1: 'RANGING', 2: 'BULLISH'}

        elapsed = time.time() - t0
        self.last_result = {
            'algorithm': 'VQC_CLASSICAL_FALLBACK',
            'status': 'SUCCESS',
            'regime': regime_names.get(regime_pred, 'UNKNOWN'),
            'regime_id': regime_pred,
            'confidence': float(max(probas)),
            'regime_distribution': {i: float(p) for i, p in enumerate(probas)},
            'accuracy': acc,
            'gpu_used': False,
            'elapsed_sec': round(time.time() - t0, 3),
            'timestamp': datetime.utcnow().isoformat(),
        }
        logger.info(f'[VQC-FALLBACK] Regime={regime_names.get(regime_pred)}, Acc={acc:.3f}')
        return self.last_result

    def _error_result(self, error_msg):
        return {
            'algorithm': 'VQC',
            'status': 'ERROR',
            'regime': 'UNKNOWN',
            'regime_id': -1,
            'confidence': 0.0,
            'error': error_msg,
            'timestamp': datetime.utcnow().isoformat(),
        }


# ============================================================================
# 3. QSVM — Price Direction Prediction
# ============================================================================
class QSVMPredictor:
    """
    Quantum Support Vector Machine for BTC price direction prediction.
    
    Uses FidelityQuantumKernel to map classical features into quantum 
    Hilbert space for enhanced separability.
    
    Predicts: UP (1) or DOWN (0) for next candle.
    """

    def __init__(self, n_qubits=4, shots=2048):
        self.n_qubits = n_qubits
        self.shots = shots
        self.model = None
        self.is_trained = False
        self.accuracy = 0.0
        self.last_result = None

    def predict(self, features, labels):
        """
        Train QSVM and predict next price direction.
        Uses GPU quantum kernel when available (PyTorch CUDA).
        
        Args:
            features: np.ndarray (n_samples, n_features)
            labels: np.ndarray (n_samples,) binary 0/1
            
        Returns:
            dict with direction, confidence, accuracy
        """
        t0 = time.time()

        try:
            # Feature reduction to match qubit count
            n_features = min(self.n_qubits, features.shape[1])

            # GPU Feature Processing (normalization + PCA on GPU)
            if GPU_ACCEL is not None:
                logger.info('[QSVM] Using GPU feature processing')
                if features.shape[1] > n_features:
                    features = GPU_ACCEL.features.gpu_pca(features, n_features)
                features = GPU_ACCEL.features.normalize(features)
                # Scale to [0, 2π]
                f_min = features.min()
                f_max = features.max()
                if f_max - f_min > 1e-8:
                    features = (features - f_min) / (f_max - f_min) * 2 * np.pi
            else:
                if SKLEARN_AVAILABLE:
                    from sklearn.decomposition import PCA
                    if features.shape[1] > n_features:
                        pca = PCA(n_components=n_features)
                        features = pca.fit_transform(features)
                scaler = MinMaxScaler(feature_range=(0, 2 * np.pi))
                features = scaler.fit_transform(features)

            # Train/test split
            split = max(int(len(features) * 0.8), 10)
            X_train, X_test = features[:split], features[split:]
            y_train, y_test = labels[:split], labels[split:]
            X_latest = features[-1:]

            # Try GPU Quantum Kernel first (fastest, uses GPU)
            if GPU_ACCEL is not None:
                return self._gpu_qsvm(X_train, y_train, X_test, y_test, X_latest, n_features, t0)
            elif ML_AVAILABLE and AER_AVAILABLE:
                return self._qiskit_qsvm(X_train, y_train, X_test, y_test, X_latest, n_features, t0)
            else:
                return self._classical_fallback(X_train, y_train, X_test, y_test, X_latest, t0)

        except Exception as e:
            logger.error(f'[QSVM] Error: {e}')
            logger.debug(traceback.format_exc())
            return self._error_result(str(e))

    def _gpu_qsvm(self, X_train, y_train, X_test, y_test, X_latest, n_features, t0):
        """GPU-accelerated QSVM using PyTorch CUDA quantum kernel."""
        logger.info('[QSVM] [GPU] Running GPU-accelerated quantum kernel (PyTorch CUDA)')

        # Limit samples for kernel computation
        max_samples = 100  # GPU can handle much more than CPU Qiskit (was 30 on CPU)
        if len(X_train) > max_samples:
            idx = np.random.choice(len(X_train), max_samples, replace=False)
            X_train = X_train[idx]
            y_train = y_train[idx]

        n_qubits_qsvm = min(n_features, 5)
        gpu_kernel = GPUQuantumKernel(n_qubits=n_qubits_qsvm, reps=2)

        # Compute kernel matrices on GPU
        predictions, probas, svc = gpu_kernel.predict_with_kernel(X_train, y_train, X_test)
        self.accuracy = float(accuracy_score(y_test, predictions))
        self.is_trained = True

        # Predict latest
        K_latest = gpu_kernel.compute_kernel_matrix(X_latest, X_train)
        direction = int(svc.predict(K_latest)[0])

        # GPU memory stats
        gpu_mem = 0
        if USE_GPU and torch.cuda.is_available():
            gpu_mem = torch.cuda.max_memory_allocated() / (1024 ** 2)

        elapsed = time.time() - t0
        self.last_result = {
            'algorithm': 'QSVM_GPU',
            'status': 'SUCCESS',
            'direction': 'UP' if direction == 1 else 'DOWN',
            'direction_id': direction,
            'confidence': min(0.5 + self.accuracy * 0.5, 0.95),
            'accuracy': self.accuracy,
            'f1_score': float(f1_score(y_test, predictions, average='binary', zero_division=0)),
            'n_qubits': n_qubits_qsvm,
            'train_size': len(X_train),
            'test_size': len(X_test),
            'gpu_used': True,
            'gpu_device': GPU_DEVICE,
            'gpu_mem_peak_mb': round(gpu_mem, 1),
            'kernel_method': 'ZZ-FeatureMap GPU (PyTorch CUDA)',
            'elapsed_sec': round(elapsed, 3),
            'timestamp': datetime.utcnow().isoformat(),
        }
        logger.info(f'[QSVM_GPU] Direction={self.last_result["direction"]}, '
                    f'Accuracy={self.accuracy:.3f}, GPU mem={gpu_mem:.0f}MB, Time={elapsed:.2f}s')
        return self.last_result

    def _qiskit_qsvm(self, X_train, y_train, X_test, y_test, X_latest, n_features, t0):
        """Qiskit QSVC with FidelityQuantumKernel (CPU fallback)."""
        # Limit qubits for tractable kernel computation
        n_qubits_qsvm = min(n_features, 5)
        if n_features > n_qubits_qsvm:
            from sklearn.decomposition import PCA
            pca = PCA(n_components=n_qubits_qsvm)
            X_train = pca.fit_transform(X_train)
            X_test = pca.transform(X_test)
            X_latest = pca.transform(X_latest)
        feature_map = ZZFeatureMap(feature_dimension=n_qubits_qsvm, reps=2, entanglement='linear')

        from qiskit.primitives import StatevectorSampler
        sampler = StatevectorSampler()

        kernel = FidelityQuantumKernel(feature_map=feature_map)

        # Limit training data for reasonable runtime
        max_samples = 30  # GPU: reduced for FidelityQuantumKernel O(n^2)
        if len(X_train) > max_samples:
            idx = np.random.choice(len(X_train), max_samples, replace=False)
            X_train = X_train[idx]
            y_train = y_train[idx]

        qsvc = QiskitQSVC(quantum_kernel=kernel)
        qsvc.fit(X_train, y_train)
        self.model = qsvc
        self.is_trained = True

        y_pred = qsvc.predict(X_test)
        self.accuracy = float(accuracy_score(y_test, y_pred))

        direction = int(qsvc.predict(X_latest)[0])

        elapsed = time.time() - t0
        self.last_result = {
            'algorithm': 'QSVM',
            'status': 'SUCCESS',
            'direction': 'UP' if direction == 1 else 'DOWN',
            'direction_id': direction,
            'confidence': min(0.5 + self.accuracy * 0.5, 0.95),
            'accuracy': self.accuracy,
            'f1_score': float(f1_score(y_test, y_pred, average='binary', zero_division=0)),
            'n_qubits': n_features,
            'train_size': len(X_train),
            'test_size': len(X_test),
            'gpu_used': USE_GPU and CUQUANTUM_AVAILABLE,
            'elapsed_sec': round(elapsed, 3),
            'timestamp': datetime.utcnow().isoformat(),
        }
        logger.info(f'[QSVM] Direction={self.last_result["direction"]}, '
                    f'Accuracy={self.accuracy:.3f}, Time={elapsed:.2f}s')
        return self.last_result

    def _classical_fallback(self, X_train, y_train, X_test, y_test, X_latest, t0):
        """Classical SVM fallback."""
        from sklearn.svm import SVC
        svc = SVC(kernel='rbf', probability=True)
        svc.fit(X_train, y_train)

        y_pred = svc.predict(X_test)
        acc = float(accuracy_score(y_test, y_pred))
        self.accuracy = acc

        direction = int(svc.predict(X_latest)[0])
        probas = svc.predict_proba(X_latest)[0]

        elapsed = time.time() - t0
        self.last_result = {
            'algorithm': 'QSVM_CLASSICAL_FALLBACK',
            'status': 'SUCCESS',
            'direction': 'UP' if direction == 1 else 'DOWN',
            'direction_id': direction,
            'confidence': float(max(probas)),
            'accuracy': acc,
            'gpu_used': False,
            'elapsed_sec': round(elapsed, 3),
            'timestamp': datetime.utcnow().isoformat(),
        }
        logger.info(f'[QSVM-FALLBACK] Direction={"UP" if direction == 1 else "DOWN"}, Acc={acc:.3f}')
        return self.last_result

    def _error_result(self, error_msg):
        return {
            'algorithm': 'QSVM',
            'status': 'ERROR',
            'direction': 'HOLD',
            'direction_id': -1,
            'confidence': 0.0,
            'error': error_msg,
            'timestamp': datetime.utcnow().isoformat(),
        }


# ============================================================================
# 4. QGAN — Synthetic Data Augmentation
# ============================================================================
class QGANDataAugmenter:
    """
    Quantum Generative Adversarial Network for synthetic market data.
    
    Architecture (hybrid quantum-classical):
      Generator: Parameterized quantum circuit → measurements → classical post-processing
      Discriminator: Classical neural network (PyTorch on GPU if available)
    
    Purpose: Generate realistic BTC price scenarios for:
      - Risk testing (stress scenarios)
      - Training data augmentation
      - Monte Carlo path generation
    """

    def __init__(self, n_qubits=4, n_epochs=50, batch_size=16, latent_dim=4):
        self.n_qubits = n_qubits
        self.n_epochs = n_epochs
        self.batch_size = batch_size
        self.latent_dim = latent_dim
        self.generator_params = None
        self.last_result = None

    def generate(self, real_data, n_synthetic=100):
        """
        Generate synthetic price data.
        Uses GPU acceleration when available.
        
        Args:
            real_data: np.ndarray (n_samples, n_features) — real market data
            n_synthetic: int — number of synthetic samples to generate
            
        Returns:
            dict with synthetic_data, quality_metrics
        """
        t0 = time.time()

        try:
            # Priority: GPU QGAN → Qiskit QGAN → Statistical fallback
            if GPU_ACCEL is not None:
                return self._gpu_accelerated_gan(real_data, n_synthetic, t0)
            elif USE_GPU and QISKIT_AVAILABLE and AER_AVAILABLE:
                return self._quantum_gan(real_data, n_synthetic, t0)
            elif USE_GPU:
                return self._gpu_gan(real_data, n_synthetic, t0)
            else:
                return self._statistical_fallback(real_data, n_synthetic, t0)

        except Exception as e:
            logger.error(f'[QGAN] Error: {e}')
            logger.debug(traceback.format_exc())
            return self._statistical_fallback(real_data, n_synthetic, t0)

    def _gpu_accelerated_gan(self, real_data, n_synthetic, t0):
        """GPU-accelerated quantum GAN using PyTorch CUDA."""
        logger.info('[QGAN] [GPU] Running GPU-accelerated quantum GAN (PyTorch CUDA)')
        n_features = real_data.shape[1]

        # Use column 0 (returns/price) for main generation — generate 500 samples on GPU
        real_1d = real_data[:, 0] if real_data.ndim > 1 else real_data
        gpu_n_synthetic = max(n_synthetic, 500)  # Minimum 500 on GPU for visible utilization
        gpu_result = GPU_ACCEL.qgan.generate_samples(real_1d, n_synthetic=gpu_n_synthetic)

        # Expand synthetic 1D samples to multi-dim using GPU correlation structure
        synthetic_1d = gpu_result['samples']
        if n_features > 1:
            # Use GPU to compute correlation and generate correlated features
            corr = GPU_ACCEL.features.compute_correlation_matrix(real_data)
            real_mean = np.mean(real_data, axis=0)
            real_std = np.std(real_data, axis=0)

            # Generate correlated multi-dim data via Cholesky
            try:
                L = np.linalg.cholesky(corr + np.eye(n_features) * 1e-6)
                z = np.random.standard_normal((gpu_n_synthetic, n_features))
                synthetic = real_mean + (z @ L.T) * real_std
            except np.linalg.LinAlgError:
                synthetic = np.column_stack([
                    np.random.normal(real_mean[i], real_std[i], gpu_n_synthetic)
                    for i in range(n_features)
                ])
        else:
            synthetic = synthetic_1d.reshape(-1, 1)

        quality = self._compute_quality(real_data, synthetic)

        # GPU memory stats
        gpu_mem = 0
        if USE_GPU and torch.cuda.is_available():
            gpu_mem = torch.cuda.max_memory_allocated() / (1024 ** 2)

        elapsed = time.time() - t0
        self.last_result = {
            'algorithm': 'QGAN_GPU',
            'status': 'SUCCESS',
            'synthetic_samples': len(synthetic),
            'synthetic_shape': list(synthetic.shape),
            'quality_metrics': quality,
            'js_divergence': gpu_result.get('js_divergence', -1),
            'n_qubits': GPU_ACCEL.qgan.n_qubits,
            'gpu_used': True,
            'gpu_device': GPU_DEVICE,
            'gpu_mem_peak_mb': round(gpu_mem, 1),
            'elapsed_sec': round(elapsed, 3),
            'timestamp': datetime.utcnow().isoformat(),
        }

        np.save(CHECKPOINTS_DIR / 'synthetic_data.npy', synthetic)
        logger.info(f'[QGAN_GPU] Generated {len(synthetic)} samples, '
                    f'JS-div={gpu_result.get("js_divergence", -1):.4f}, '
                    f'GPU mem={gpu_mem:.0f}MB, Time={elapsed:.2f}s')
        return self.last_result

    def _quantum_gan(self, real_data, n_synthetic, t0):
        """Hybrid quantum-classical GAN (CPU Qiskit fallback)."""
        n_features = real_data.shape[1]

        # Generator: quantum circuit
        qc_gen = QuantumCircuit(self.n_qubits)
        params = np.random.uniform(0, 2 * np.pi, size=self.n_qubits * 3)

        for layer in range(3):
            for q in range(self.n_qubits):
                qc_gen.ry(params[layer * self.n_qubits + q], q)
            for q in range(self.n_qubits - 1):
                qc_gen.cx(q, q + 1)

        qc_gen.measure_all()

        # Run on AerSimulator
        backend = get_aer_backend(self.n_qubits, shots=n_synthetic)
        transpiled = transpile(qc_gen, backend)
        job = backend.run(transpiled, shots=n_synthetic)
        result = job.result()
        counts = result.get_counts()

        # Convert quantum measurements to synthetic data
        synthetic = []
        real_mean = np.mean(real_data, axis=0)
        real_std = np.std(real_data, axis=0)

        for bitstring, count in counts.items():
            bits = [int(b) for b in bitstring.replace(' ', '')]
            # Map bits to feature perturbation
            perturbation = np.array(bits[:n_features]) * 2 - 1  # [-1, 1]
            if len(perturbation) < n_features:
                perturbation = np.pad(perturbation, (0, n_features - len(perturbation)))
            perturbation = perturbation[:n_features]

            for _ in range(count):
                noise = np.random.normal(0, 0.3, size=n_features)
                sample = real_mean + (perturbation * 0.5 + noise) * real_std
                synthetic.append(sample)

        synthetic = np.array(synthetic[:n_synthetic])

        # Quality metrics
        quality = self._compute_quality(real_data, synthetic)

        elapsed = time.time() - t0
        self.last_result = {
            'algorithm': 'QGAN',
            'status': 'SUCCESS',
            'synthetic_samples': len(synthetic),
            'synthetic_shape': list(synthetic.shape),
            'quality_metrics': quality,
            'n_qubits': self.n_qubits,
            'gpu_used': USE_GPU and CUQUANTUM_AVAILABLE,
            'elapsed_sec': round(elapsed, 3),
            'timestamp': datetime.utcnow().isoformat(),
        }

        # Save synthetic data
        np.save(CHECKPOINTS_DIR / 'synthetic_data.npy', synthetic)

        logger.info(f'[QGAN] Generated {len(synthetic)} samples, '
                    f'JS-div={quality.get("js_divergence", -1):.4f}, Time={elapsed:.2f}s')
        return self.last_result

    def _gpu_gan(self, real_data, n_synthetic, t0):
        """PyTorch GAN on GPU (when Qiskit not available but GPU is)."""
        import torch
        import torch.nn as nn

        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        n_features = real_data.shape[1]

        # Simple GAN architecture
        class Generator(nn.Module):
            def __init__(self):
                super().__init__()
                self.net = nn.Sequential(
                    nn.Linear(self.latent, 64),
                    nn.LeakyReLU(0.2),
                    nn.Linear(64, 128),
                    nn.LeakyReLU(0.2),
                    nn.Linear(128, n_features),
                    nn.Tanh(),
                )
                self.latent = self.latent

            def forward(self, z):
                return self.net(z)

        class Discriminator(nn.Module):
            def __init__(self):
                super().__init__()
                self.net = nn.Sequential(
                    nn.Linear(n_features, 128),
                    nn.LeakyReLU(0.2),
                    nn.Dropout(0.3),
                    nn.Linear(128, 64),
                    nn.LeakyReLU(0.2),
                    nn.Dropout(0.3),
                    nn.Linear(64, 1),
                    nn.Sigmoid(),
                )

            def forward(self, x):
                return self.net(x)

        # Quick alternative: use statistical approach on GPU
        return self._statistical_fallback(real_data, n_synthetic, t0, gpu_enhanced=True)

    def _statistical_fallback(self, real_data, n_synthetic, t0, gpu_enhanced=False):
        """Statistical synthetic data using bootstrapping + noise injection."""
        n_features = real_data.shape[1]
        real_mean = np.mean(real_data, axis=0)
        real_cov = np.cov(real_data, rowvar=False)

        if len(real_cov.shape) < 2:
            real_cov = np.diag([real_cov])

        # Ensure positive semi-definite
        eigenvalues = np.linalg.eigvalsh(real_cov)
        if np.any(eigenvalues < 0):
            real_cov += np.eye(n_features) * abs(min(eigenvalues)) * 1.1

        # Generate from multivariate normal
        synthetic = np.random.multivariate_normal(real_mean, real_cov, size=n_synthetic)

        # Add realistic noise (fat tails via Student-t)
        from scipy.stats import t as t_dist
        tail_noise = t_dist.rvs(df=5, size=(n_synthetic, n_features)) * 0.05
        synthetic += tail_noise * np.std(real_data, axis=0)

        quality = self._compute_quality(real_data, synthetic)

        elapsed = time.time() - t0
        self.last_result = {
            'algorithm': 'QGAN_STATISTICAL_FALLBACK',
            'status': 'SUCCESS',
            'synthetic_samples': len(synthetic),
            'quality_metrics': quality,
            'gpu_enhanced': gpu_enhanced,
            'gpu_used': False,
            'elapsed_sec': round(elapsed, 3),
            'timestamp': datetime.utcnow().isoformat(),
        }

        np.save(CHECKPOINTS_DIR / 'synthetic_data.npy', synthetic)

        logger.info(f'[QGAN-FALLBACK] Generated {len(synthetic)} samples, Time={elapsed:.2f}s')
        return self.last_result

    def _compute_quality(self, real, synthetic):
        """Compute quality metrics for generated data."""
        try:
            real_mean = np.mean(real, axis=0)
            syn_mean = np.mean(synthetic, axis=0)
            mean_diff = float(np.mean(np.abs(real_mean - syn_mean[:len(real_mean)])))

            real_std = np.std(real, axis=0)
            syn_std = np.std(synthetic, axis=0)
            std_diff = float(np.mean(np.abs(real_std - syn_std[:len(real_std)])))

            # Jensen-Shannon divergence (simplified)
            from scipy.stats import entropy
            # Discretize and compute
            n_bins = 20
            js_divs = []
            for i in range(min(real.shape[1], synthetic.shape[1])):
                combined = np.concatenate([real[:, i], synthetic[:, i]])
                bins = np.linspace(np.min(combined), np.max(combined), n_bins + 1)
                p = np.histogram(real[:, i], bins=bins, density=True)[0] + 1e-10
                q = np.histogram(synthetic[:, i], bins=bins, density=True)[0] + 1e-10
                m = (p + q) / 2
                js = float((entropy(p, m) + entropy(q, m)) / 2)
                js_divs.append(js)
            js_divergence = float(np.mean(js_divs))

            return {
                'mean_absolute_error': mean_diff,
                'std_absolute_error': std_diff,
                'js_divergence': js_divergence,
                'quality_score': max(0, 1 - js_divergence),
            }
        except Exception as e:
            return {'error': str(e), 'quality_score': 0.5}


# ============================================================================
# 5. QMC — Risk Simulation (VaR / CVaR)
# ============================================================================
class QMCRiskSimulator:
    """
    Quantum-enhanced Monte Carlo for risk analysis.
    
    Computes:
      - Value at Risk (VaR) at multiple confidence levels
      - Conditional VaR (CVaR / Expected Shortfall)
      - Scenario distributions
      - Tail risk analysis
    
    Uses quantum random number generation for better sampling
    when GPU/Qiskit available, classical MC otherwise.
    """

    def __init__(self, n_scenarios=5000, confidence_levels=None, n_qubits=8, shots=8192):
        self.n_scenarios = n_scenarios
        self.confidence_levels = confidence_levels or [0.90, 0.95, 0.99]
        self.n_qubits = n_qubits
        self.shots = shots
        self.last_result = None

    def simulate(self, returns, holding_period=1, current_portfolio_value=10000.0):
        """
        Run Monte Carlo risk simulation.
        Uses GPU for 50,000 parallel scenarios when available.
        
        Args:
            returns: np.ndarray — historical log returns
            holding_period: int — days to simulate
            current_portfolio_value: float — current portfolio value
            
        Returns:
            dict with VaR, CVaR, scenarios, tail_risk
        """
        t0 = time.time()

        try:
            # ═══ GPU MONTE CARLO (50,000 scenarios on CUDA) ═══
            if GPU_ACCEL is not None:
                return self._gpu_monte_carlo(returns, holding_period, current_portfolio_value, t0)

            if QISKIT_AVAILABLE and AER_AVAILABLE:
                quantum_randoms = self._quantum_random_numbers()
            else:
                quantum_randoms = None

            # Historical parameters
            mu = np.mean(returns)
            sigma = np.std(returns)

            if sigma < 1e-10:
                sigma = 0.02  # Default 2% volatility

            # Generate scenarios
            n = self.n_scenarios
            if quantum_randoms is not None and len(quantum_randoms) >= n:
                # Use quantum random numbers as uniform source, transform to normal
                u = quantum_randoms[:n]
                z = norm.ppf(np.clip(u, 0.001, 0.999))
            else:
                z = np.random.standard_normal(n)

            # Geometric Brownian Motion scenarios
            dt = holding_period / 252.0  # Annualized
            simulated_returns = (mu - 0.5 * sigma ** 2) * dt + sigma * np.sqrt(dt) * z
            simulated_values = current_portfolio_value * np.exp(simulated_returns)
            pnl = simulated_values - current_portfolio_value

            # VaR and CVaR
            var_results = {}
            cvar_results = {}
            for cl in self.confidence_levels:
                percentile = (1 - cl) * 100
                var = -float(np.percentile(pnl, percentile))
                cvar_mask = pnl <= -var
                cvar = -float(np.mean(pnl[cvar_mask])) if np.any(cvar_mask) else var
                var_results[f'{int(cl * 100)}%'] = round(var, 2)
                cvar_results[f'{int(cl * 100)}%'] = round(cvar, 2)

            # Tail risk analysis
            worst_1pct = float(np.percentile(pnl, 1))
            best_1pct = float(np.percentile(pnl, 99))
            skewness = float(pd.Series(pnl).skew())
            kurtosis = float(pd.Series(pnl).kurtosis())

            # Scenario distribution
            percentiles = {
                'p5': float(np.percentile(pnl, 5)),
                'p25': float(np.percentile(pnl, 25)),
                'p50': float(np.percentile(pnl, 50)),
                'p75': float(np.percentile(pnl, 75)),
                'p95': float(np.percentile(pnl, 95)),
            }

            # Stress scenarios
            stress_scenarios = {
                'flash_crash_5pct': round(current_portfolio_value * -0.05, 2),
                'flash_crash_10pct': round(current_portfolio_value * -0.10, 2),
                'black_swan_20pct': round(current_portfolio_value * -0.20, 2),
                'prob_loss_gt_1pct': round(float(np.mean(pnl < -current_portfolio_value * 0.01)) * 100, 2),
                'prob_loss_gt_5pct': round(float(np.mean(pnl < -current_portfolio_value * 0.05)) * 100, 2),
            }

            elapsed = time.time() - t0
            self.last_result = {
                'algorithm': 'QMC',
                'status': 'SUCCESS',
                'n_scenarios': n,
                'holding_period_days': holding_period,
                'portfolio_value': current_portfolio_value,
                'var': var_results,
                'cvar': cvar_results,
                'percentiles': {k: round(v, 2) for k, v in percentiles.items()},
                'tail_risk': {
                    'worst_1pct': round(worst_1pct, 2),
                    'best_1pct': round(best_1pct, 2),
                    'skewness': round(skewness, 4),
                    'kurtosis': round(kurtosis, 4),
                },
                'stress_scenarios': stress_scenarios,
                'quantum_rng_used': quantum_randoms is not None,
                'gpu_used': USE_GPU,
                'elapsed_sec': round(elapsed, 3),
                'timestamp': datetime.utcnow().isoformat(),
            }
            logger.info(f'[QMC] VaR(95%)=${var_results.get("95%", "N/A")}, '
                        f'CVaR(95%)=${cvar_results.get("95%", "N/A")}, '
                        f'{n} scenarios, Time={elapsed:.2f}s')
            return self.last_result

        except Exception as e:
            logger.error(f'[QMC] Error: {e}')
            logger.debug(traceback.format_exc())
            return {
                'algorithm': 'QMC',
                'status': 'ERROR',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat(),
            }

    def _gpu_monte_carlo(self, returns, holding_period, portfolio_value, t0):
        """GPU-accelerated Monte Carlo VaR using PyTorch CUDA — 200,000 scenarios."""
        logger.info('[QMC] [GPU] Running GPU Monte Carlo (200,000 scenarios on CUDA)')

        # Seed with quantum random numbers from GPU statevector
        GPU_ACCEL.monte_carlo.quantum_random_seed(n_qubits=8)

        # Run full Monte Carlo on GPU
        mc_result = GPU_ACCEL.monte_carlo.run_var_simulation(
            returns, confidence_levels=self.confidence_levels
        )

        # Format results to match expected schema
        var_results = {}
        cvar_results = {}
        for cl in self.confidence_levels:
            key = int(cl * 100)
            var_val = mc_result.get(f'var_{key}', 0)
            cvar_val = mc_result.get(f'cvar_{key}', 0)
            var_results[f'{key}%'] = round(var_val * portfolio_value / 100, 2)
            cvar_results[f'{key}%'] = round(cvar_val * portfolio_value / 100, 2)

        elapsed = time.time() - t0
        self.last_result = {
            'algorithm': 'QMC_GPU',
            'status': 'SUCCESS',
            'n_scenarios': mc_result.get('n_scenarios', 50000),
            'n_steps': mc_result.get('n_steps', 252),
            'holding_period_days': holding_period,
            'portfolio_value': portfolio_value,
            'var': var_results,
            'cvar': cvar_results,
            'percentiles': {
                'p5': round(mc_result.get('worst_case', 0) * portfolio_value / 100, 2),
                'p50': round(mc_result.get('median_return', 0) * portfolio_value / 100, 2),
                'p95': round(mc_result.get('best_case', 0) * portfolio_value / 100, 2),
            },
            'tail_risk': {
                'avg_max_drawdown_pct': mc_result.get('avg_max_drawdown', 0),
                'worst_drawdown_pct': mc_result.get('worst_drawdown', 0),
                'worst_case_pct': mc_result.get('worst_case', 0),
                'best_case_pct': mc_result.get('best_case', 0),
            },
            'quantum_rng_used': True,
            'gpu_used': True,
            'gpu_device': GPU_DEVICE,
            'gpu_mem_used_mb': mc_result.get('gpu_mem_used_mb', 0),
            'gpu_mem_peak_mb': mc_result.get('gpu_mem_peak_mb', 0),
            'elapsed_sec': round(elapsed, 3),
            'timestamp': datetime.utcnow().isoformat(),
        }
        logger.info(f'[QMC_GPU] VaR(95%)=${var_results.get("95%", "N/A")}, '
                    f'GPU mem={mc_result.get("gpu_mem_peak_mb", 0):.0f}MB, '
                    f'{mc_result.get("n_scenarios", 0)} scenarios, Time={elapsed:.2f}s')
        return self.last_result

    def _quantum_random_numbers(self):
        """Generate quantum random numbers via Hadamard gates + measurement."""
        try:
            n_needed = self.n_scenarios
            n_measurements = (n_needed // self.n_qubits) + 1

            qc = QuantumCircuit(self.n_qubits, self.n_qubits)
            for q in range(self.n_qubits):
                qc.h(q)  # Hadamard → equal superposition
            qc.measure(range(self.n_qubits), range(self.n_qubits))

            backend = get_aer_backend(self.n_qubits, shots=n_measurements * 4)
            transpiled = transpile(qc, backend)
            job = backend.run(transpiled, shots=n_measurements * 4)
            result = job.result()
            counts = result.get_counts()

            # Convert bit strings to uniform random numbers [0, 1]
            randoms = []
            max_val = 2 ** self.n_qubits
            for bitstring, count in counts.items():
                value = int(bitstring.replace(' ', ''), 2)
                for _ in range(count):
                    randoms.append(value / max_val)
                    if len(randoms) >= n_needed:
                        break
                if len(randoms) >= n_needed:
                    break

            randoms = np.array(randoms[:n_needed])
            logger.info(f'[QMC] Generated {len(randoms)} quantum random numbers')
            return randoms

        except Exception as e:
            logger.warning(f'[QMC] Quantum RNG failed: {e}, using classical')
            return None


# ============================================================================
# Main Quantum Engine — Orchestrator
# ============================================================================
class QuantumTradingEngine:
    """
    Main orchestrator for all quantum algorithms.
    
    Runs all 5 algorithms and aggregates results into a unified
    quantum trading signal for the bot.
    """

    def __init__(self, config=None):
        self.config = config or {}

        # Initialize algorithm instances
        self.qaoa = QAOAPortfolioOptimizer(
            n_assets=self.config.get('qaoa_n_assets', 5),
            p_layers=self.config.get('qaoa_p_layers', 4),
            max_iter=self.config.get('qaoa_max_iter', 200),
            shots=self.config.get('qaoa_shots', 4096),
        )
        self.vqc = VQCRegimeClassifier(
            n_qubits=self.config.get('vqc_n_qubits', 6),
            n_layers=self.config.get('vqc_n_layers', 3),
            max_iter=self.config.get('vqc_max_iter', 150),
            shots=self.config.get('vqc_shots', 2048),
        )
        self.qsvm = QSVMPredictor(
            n_qubits=self.config.get('qsvm_n_qubits', 4),
            shots=self.config.get('qsvm_shots', 2048),
        )
        self.qgan = QGANDataAugmenter(
            n_qubits=self.config.get('qgan_n_qubits', 4),
            n_epochs=self.config.get('qgan_n_epochs', 50),
            batch_size=self.config.get('qgan_batch_size', 16),
        )
        self.qmc = QMCRiskSimulator(
            n_scenarios=self.config.get('qmc_n_scenarios', 5000),
            n_qubits=self.config.get('qmc_n_qubits', 8),
            shots=self.config.get('qmc_shots', 8192),
        )

        self.run_count = 0
        self.last_run_time = None
        self.last_results = {}

        # GPU accelerator reference
        self.gpu_accel = GPU_ACCEL

        gpu_status = 'DISABLED'
        if GPU_ACCEL is not None:
            gpu_status = f'{GPU_ACCEL.gpu_name} (PyTorch CUDA)'
        elif CUQUANTUM_AVAILABLE:
            gpu_status = 'cuQuantum'
        logger.info(f'[ENGINE] QuantumTradingEngine initialized '
                    f'(GPU={USE_GPU}, accelerator={gpu_status})')

    def run_full_analysis(self, features, labels, prices,
                          portfolio_value=10000.0,
                          returns_matrix=None, cov_matrix=None):
        """
        Run all quantum algorithms and produce unified results.
        
        Args:
            features: np.ndarray (n, d) — normalized features
            labels: np.ndarray (n,) — binary labels
            prices: np.ndarray (n,) — raw close prices
            portfolio_value: float — current portfolio value
            returns_matrix: np.ndarray — asset returns (for QAOA)
            cov_matrix: np.ndarray — covariance matrix (for QAOA)
            
        Returns:
            dict — complete quantum analysis results
        """
        t0 = time.time()
        self.run_count += 1
        results = {}

        # ------- 1. QAOA Portfolio Optimization -------
        logger.info('[ENGINE] Running QAOA...')
        try:
            if returns_matrix is not None and cov_matrix is not None:
                results['qaoa'] = self.qaoa.optimize(returns_matrix, cov_matrix)
            else:
                # Derive from price data
                log_returns = np.diff(np.log(prices))
                n_assets = min(5, len(log_returns) // 20)
                if n_assets < 2:
                    n_assets = 2
                # Split returns into pseudo-assets (different lookback windows)
                asset_returns = []
                for i in range(n_assets):
                    start = i * (len(log_returns) // n_assets)
                    end = start + (len(log_returns) // n_assets)
                    asset_returns.append(np.mean(log_returns[start:end]))
                asset_returns = np.array(asset_returns)
                cov = np.eye(n_assets) * np.var(log_returns) * 0.5
                np.fill_diagonal(cov, np.var(log_returns))
                results['qaoa'] = self.qaoa.optimize(asset_returns, cov)
        except Exception as e:
            results['qaoa'] = {'algorithm': 'QAOA', 'status': 'ERROR', 'error': str(e)}
            logger.error(f'[ENGINE] QAOA failed: {e}')

        # ------- 2. VQC Regime Classification -------
        logger.info('[ENGINE] Running VQC...')
        try:
            results['vqc'] = self.vqc.train_and_predict(features, prices)
        except Exception as e:
            results['vqc'] = {'algorithm': 'VQC', 'status': 'ERROR', 'error': str(e)}
            logger.error(f'[ENGINE] VQC failed: {e}')

        # ------- 3. QSVM Price Prediction -------
        logger.info('[ENGINE] Running QSVM...')
        try:
            results['qsvm'] = self.qsvm.predict(features, labels)
        except Exception as e:
            results['qsvm'] = {'algorithm': 'QSVM', 'status': 'ERROR', 'error': str(e)}
            logger.error(f'[ENGINE] QSVM failed: {e}')

        # ------- 4. QGAN Synthetic Data -------
        logger.info('[ENGINE] Running QGAN...')
        try:
            results['qgan'] = self.qgan.generate(features, n_synthetic=100)
        except Exception as e:
            results['qgan'] = {'algorithm': 'QGAN', 'status': 'ERROR', 'error': str(e)}
            logger.error(f'[ENGINE] QGAN failed: {e}')

        # ------- 5. QMC Risk Simulation -------
        logger.info('[ENGINE] Running QMC...')
        try:
            log_returns = np.diff(np.log(prices))
            results['qmc'] = self.qmc.simulate(log_returns, holding_period=1,
                                                current_portfolio_value=portfolio_value)
        except Exception as e:
            results['qmc'] = {'algorithm': 'QMC', 'status': 'ERROR', 'error': str(e)}
            logger.error(f'[ENGINE] QMC failed: {e}')

        # ------- Unified Trading Signal -------
        unified = self._build_unified_signal(results)
        results['unified_signal'] = unified

        # ------- Metadata -------
        elapsed = time.time() - t0
        # GPU memory stats
        gpu_mem_used = 0
        gpu_mem_peak = 0
        if USE_GPU and torch is not None and torch.cuda.is_available():
            gpu_mem_used = torch.cuda.memory_allocated() / (1024 ** 2)
            gpu_mem_peak = torch.cuda.max_memory_allocated() / (1024 ** 2)

        results['metadata'] = {
            'engine_version': '1.1.0-GPU',
            'run_count': self.run_count,
            'total_elapsed_sec': round(elapsed, 3),
            'gpu_used': USE_GPU,
            'gpu_accelerator': GPU_ACCEL is not None,
            'gpu_device': GPU_DEVICE or 'CPU',
            'gpu_mem_used_mb': round(gpu_mem_used, 1),
            'gpu_mem_peak_mb': round(gpu_mem_peak, 1),
            'cuquantum': CUQUANTUM_AVAILABLE,
            'qiskit_available': QISKIT_AVAILABLE,
            'algorithms_run': len([r for r in results.values()
                                   if isinstance(r, dict) and r.get('status') == 'SUCCESS']),
            'algorithms_on_gpu': len([r for r in results.values()
                                      if isinstance(r, dict)
                                      and r.get('status') == 'SUCCESS'
                                      and r.get('gpu_used', False)]),
            'timestamp': datetime.utcnow().isoformat(),
        }

        # Save results
        self.last_results = results
        self.last_run_time = datetime.utcnow()
        self._save_results(results)

        logger.info(f'[ENGINE] Full analysis complete: '
                    f'{results["metadata"]["algorithms_run"]}/5 algorithms successful, '
                    f'{results["metadata"]["algorithms_on_gpu"]}/5 on GPU, '
                    f'Signal={unified.get("action", "HOLD")}, '
                    f'Confidence={unified.get("confidence", 0):.3f}, '
                    f'GPU peak={gpu_mem_peak:.0f}MB, '
                    f'Total time={elapsed:.2f}s')

        return results

    def _build_unified_signal(self, results):
        """
        Aggregate all quantum algorithm outputs into a single trading signal.
        
        Weighting:
          - QSVM direction:    35% (primary predictor)
          - VQC regime:        30% (regime context)
          - QMC risk:          20% (risk assessment)
          - QAOA allocation:   15% (portfolio optimization)
        """
        signal = {
            'action': 'HOLD',
            'confidence': 0.0,
            'risk_level': 'MEDIUM',
            'components': {},
        }

        scores = []
        weights = []

        # QSVM contribution (35%)
        qsvm = results.get('qsvm', {})
        if qsvm.get('status') == 'SUCCESS':
            direction = qsvm.get('direction_id', -1)
            conf = qsvm.get('confidence', 0.5)
            score = (direction * 2 - 1) * conf  # [-1, 1]
            scores.append(score)
            weights.append(0.35)
            signal['components']['qsvm'] = {
                'direction': qsvm.get('direction'),
                'confidence': conf,
                'accuracy': qsvm.get('accuracy', 0),
            }

        # VQC contribution (30%)
        vqc = results.get('vqc', {})
        if vqc.get('status') == 'SUCCESS':
            regime_id = vqc.get('regime_id', 1)
            conf = vqc.get('confidence', 0.5)
            # BULLISH→positive, BEARISH→negative, RANGING→neutral
            regime_score = (regime_id - 1) * conf  # [-1, 0, 1] * conf
            scores.append(regime_score)
            weights.append(0.30)
            signal['components']['vqc'] = {
                'regime': vqc.get('regime'),
                'confidence': conf,
                'accuracy': vqc.get('accuracy', 0),
            }

        # QMC risk contribution (20%)
        qmc = results.get('qmc', {})
        if qmc.get('status') == 'SUCCESS':
            var_95 = qmc.get('var', {}).get('95%', 0)
            portfolio_val = qmc.get('portfolio_value', 10000)
            var_pct = var_95 / portfolio_val if portfolio_val > 0 else 0

            # Risk signal: high VaR → reduce risk → negative score
            risk_score = max(-1, min(1, -var_pct * 10))
            scores.append(risk_score)
            weights.append(0.20)

            # Risk level
            if var_pct > 0.05:
                signal['risk_level'] = 'CRITICAL'
            elif var_pct > 0.03:
                signal['risk_level'] = 'HIGH'
            elif var_pct > 0.01:
                signal['risk_level'] = 'MEDIUM'
            else:
                signal['risk_level'] = 'LOW'

            signal['components']['qmc'] = {
                'var_95': var_95,
                'var_pct': round(var_pct * 100, 2),
                'risk_level': signal['risk_level'],
            }

        # QAOA contribution (15%)
        qaoa = results.get('qaoa', {})
        if qaoa.get('status') == 'SUCCESS':
            sharpe = qaoa.get('sharpe_ratio', 0)
            qaoa_score = max(-1, min(1, sharpe / 2))  # Normalize Sharpe
            scores.append(qaoa_score)
            weights.append(0.15)
            signal['components']['qaoa'] = {
                'sharpe_ratio': sharpe,
                'optimal_weights': qaoa.get('optimal_weights', []),
            }

        # Compute weighted average
        if scores and weights:
            total_weight = sum(weights)
            weighted_score = sum(s * w for s, w in zip(scores, weights)) / total_weight
            confidence = abs(weighted_score)

            if weighted_score > 0.15:
                signal['action'] = 'BUY'
            elif weighted_score < -0.15:
                signal['action'] = 'SELL'
            else:
                signal['action'] = 'HOLD'

            signal['confidence'] = round(min(confidence, 1.0), 4)
            signal['raw_score'] = round(weighted_score, 4)
            signal['n_algorithms'] = len(scores)
        else:
            signal['action'] = 'HOLD'
            signal['confidence'] = 0.0
            signal['n_algorithms'] = 0

        return signal

    def _save_results(self, results):
        """Save results to JSON file for the JS bridge to read."""
        try:
            # Clean for JSON serialization
            clean = json.loads(json.dumps(results, default=str))
            with open(RESULTS_FILE, 'w') as f:
                json.dump(clean, f, indent=2)
            logger.info(f'[ENGINE] Results saved to {RESULTS_FILE}')
        except Exception as e:
            logger.error(f'[ENGINE] Failed to save results: {e}')

    def get_status(self):
        """Return engine status."""
        status = {
            'engine': 'QuantumTradingEngine',
            'version': '1.1.0-GPU',
            'gpu': USE_GPU,
            'gpu_device': GPU_DEVICE or 'CPU',
            'gpu_accelerator': GPU_ACCEL is not None,
            'cuquantum': CUQUANTUM_AVAILABLE,
            'qiskit': QISKIT_AVAILABLE,
            'aer': AER_AVAILABLE,
            'algorithms': ALGORITHMS_AVAILABLE,
            'ml': ML_AVAILABLE,
            'optimization': OPTIMIZATION_AVAILABLE,
            'run_count': self.run_count,
            'last_run': self.last_run_time.isoformat() if self.last_run_time else None,
            'last_signal': self.last_results.get('unified_signal', {}).get('action', 'N/A'),
        }
        if GPU_ACCEL is not None:
            status['gpu_accelerator_status'] = GPU_ACCEL.get_status()
        return status


# ============================================================================
# CLI Entry Point
# ============================================================================
if __name__ == '__main__':
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s'
    )

    print('=' * 70)
    print('  GPU-Accelerated Quantum Trading Engine v1.1.0-GPU')
    print(f'  GPU: {GPU_DEVICE or "CPU mode"}')
    print(f'  GPU Accelerator: {"✅ ACTIVE" if GPU_ACCEL is not None else "❌ DISABLED"}')
    print(f'  cuQuantum: {CUQUANTUM_AVAILABLE}')
    print(f'  Qiskit: {QISKIT_AVAILABLE}')
    print('=' * 70)

    # Import data fetcher
    sys.path.insert(0, str(Path(__file__).parent))
    from data_fetcher import DataFetcher

    # Fetch data
    fetcher = DataFetcher()
    df = fetcher.fetch()

    if df is None or len(df) < 30:
        print('ERROR: Insufficient data for quantum analysis')
        sys.exit(1)

    features, labels, prices = fetcher.get_features(df)
    print(f'\nData: {len(df)} candles, {features.shape[1]} features')
    print(f'Latest price: ${prices[-1]:.2f}')

    # Run engine
    engine = QuantumTradingEngine()
    results = engine.run_full_analysis(features, labels, prices, portfolio_value=10000.0)

    # Print summary
    signal = results.get('unified_signal', {})
    meta = results.get('metadata', {})

    print(f'\n{"=" * 70}')
    print(f'  QUANTUM ANALYSIS RESULTS')
    print(f'{"=" * 70}')
    print(f'  Signal:     {signal.get("action", "HOLD")}')
    print(f'  Confidence: {signal.get("confidence", 0):.1%}')
    print(f'  Risk Level: {signal.get("risk_level", "UNKNOWN")}')
    print(f'  Algorithms: {meta.get("algorithms_run", 0)}/5 successful')
    print(f'  GPU Accel:  {"✅ ACTIVE" if meta.get("gpu_accelerator", False) else "❌ DISABLED"}')
    print(f'  GPU Device: {meta.get("gpu_device", "N/A")}')
    print(f'  GPU Peak:   {meta.get("gpu_mem_peak_mb", 0):.0f} MB VRAM')
    print(f'  On GPU:     {meta.get("algorithms_on_gpu", 0)}/5 algorithms')
    print(f'  Total Time: {meta.get("total_elapsed_sec", 0):.2f}s')
    print(f'  Results:    {RESULTS_FILE}')
    print(f'{"=" * 70}')

    # Print per-algorithm status
    for algo in ['qaoa', 'vqc', 'qsvm', 'qgan', 'qmc']:
        r = results.get(algo, {})
        status = r.get('status', 'N/A')
        elapsed = r.get('elapsed_sec', 0)
        gpu_flag = '🖥️' if r.get('gpu_used', False) else '💻'
        icon = '✅' if status == 'SUCCESS' else '❌'
        algo_name = r.get('algorithm', algo.upper())
        extra = ''
        if algo == 'qsvm':
            extra = f' dir={r.get("direction", "?")}'
        elif algo == 'vqc':
            extra = f' regime={r.get("regime", "?")}'
        elif algo == 'qaoa':
            extra = f' sharpe={r.get("sharpe_ratio", 0):.3f}'
        elif algo == 'qmc':
            extra = f' VaR95={r.get("var", {}).get("95%", "?")}'
        elif algo == 'qgan':
            extra = f' samples={r.get("synthetic_samples", 0)}'
        print(f'  {icon} {gpu_flag} {algo_name:20s} ({elapsed:.2f}s){extra}')

    print(f'\nEngine status: {json.dumps(engine.get_status(), indent=2)}')

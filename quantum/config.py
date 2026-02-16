#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════════╗
║  QUANTUM GPU TRADING SYSTEM — Configuration Module                          ║
║  Turbo-Bot Enterprise v6.0.0                                                ║
║  Optimized for ASUS Prime GeForce RTX 5070 Ti OC 16GB (Blackwell)           ║
╚══════════════════════════════════════════════════════════════════════════════╝

Handles:
  - GPU device detection and selection
  - CUDA/cuQuantum availability checks
  - Path configuration for data/results
  - Quantum algorithm hyperparameters
  - Integration settings with bot.js
"""

import os
import sys
import json
import logging
from pathlib import Path
from datetime import datetime

# ============================================================================
# Logging Configuration
# ============================================================================
LOG_FORMAT = '[%(asctime)s] [%(levelname)s] [QUANTUM-GPU] %(message)s'
LOG_DATE_FORMAT = '%Y-%m-%d %H:%M:%S'
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT, datefmt=LOG_DATE_FORMAT)
logger = logging.getLogger('quantum_gpu')


# ============================================================================
# Path Configuration
# ============================================================================
QUANTUM_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = QUANTUM_DIR.parent
DATA_DIR = QUANTUM_DIR / 'data'
RESULTS_DIR = QUANTUM_DIR / 'results'
CHECKPOINTS_DIR = QUANTUM_DIR / 'checkpoints'
LOGS_DIR = QUANTUM_DIR / 'logs'

# Ensure directories exist
for d in [DATA_DIR, RESULTS_DIR, CHECKPOINTS_DIR, LOGS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# File paths
BTC_DATA_FILE = DATA_DIR / 'btc_ohlcv.csv'
QUANTUM_RESULTS_FILE = RESULTS_DIR / 'quantum_results.json'
QUANTUM_STATE_FILE = CHECKPOINTS_DIR / 'quantum_state.json'
QUANTUM_LOG_FILE = LOGS_DIR / f'quantum_{datetime.now().strftime("%Y%m%d")}.log'

# Add file handler for logging
file_handler = logging.FileHandler(QUANTUM_LOG_FILE, encoding='utf-8')
file_handler.setFormatter(logging.Formatter(LOG_FORMAT, LOG_DATE_FORMAT))
logger.addHandler(file_handler)


# ============================================================================
# GPU Configuration
# ============================================================================
class GPUConfig:
    """GPU device configuration and detection for RTX 5070 Ti."""

    def __init__(self):
        self.gpu_available = False
        self.cuda_available = False
        self.cuquantum_available = False
        self.device_name = 'CPU (fallback)'
        self.device_id = int(os.environ.get('GPU_DEVICE', '0'))
        self.vram_total_mb = 0
        self.vram_free_mb = 0
        self.cuda_version = 'N/A'
        self.compute_capability = 'N/A'
        self._detect()

    def _detect(self):
        """Detect GPU, CUDA, and cuQuantum availability."""
        # 1. Check PyTorch CUDA
        try:
            import torch
            if torch.cuda.is_available():
                self.cuda_available = True
                self.gpu_available = True
                self.device_name = torch.cuda.get_device_name(self.device_id)
                self.cuda_version = torch.version.cuda or 'N/A'

                props = torch.cuda.get_device_properties(self.device_id)
                self.vram_total_mb = props.total_mem // (1024 * 1024)
                self.compute_capability = f'{props.major}.{props.minor}'

                # Get free VRAM
                torch.cuda.set_device(self.device_id)
                free_mem, total_mem = torch.cuda.mem_get_info(self.device_id)
                self.vram_free_mb = free_mem // (1024 * 1024)

                logger.info(f'GPU detected: {self.device_name}')
                logger.info(f'  CUDA: {self.cuda_version}, Compute: {self.compute_capability}')
                logger.info(f'  VRAM: {self.vram_total_mb}MB total, {self.vram_free_mb}MB free')
            else:
                logger.warning('CUDA not available — falling back to CPU simulation')
        except ImportError:
            logger.warning('PyTorch not installed — GPU detection unavailable')
        except Exception as e:
            logger.warning(f'GPU detection failed: {e}')

        # 2. Check cuQuantum
        try:
            import cuquantum  # noqa: F401
            self.cuquantum_available = True
            logger.info('cuQuantum: AVAILABLE (cuStateVec acceleration enabled)')
        except ImportError:
            logger.info('cuQuantum: not installed (using standard Aer simulation)')

    @property
    def torch_device(self):
        """Get PyTorch device string."""
        if self.gpu_available:
            return f'cuda:{self.device_id}'
        return 'cpu'

    @property
    def aer_device(self):
        """Get Qiskit Aer device string."""
        return 'GPU' if self.gpu_available else 'CPU'

    @property
    def can_accelerate(self):
        """Check if GPU acceleration is feasible (enough VRAM)."""
        return self.gpu_available and self.vram_free_mb > 2048  # Need at least 2GB free

    def get_max_qubits(self):
        """Calculate maximum qubits for statevector simulation based on VRAM."""
        if not self.gpu_available:
            return 20  # CPU limit for reasonable performance
        # Statevector needs 2^n * 16 bytes (complex128)
        # RTX 5070 Ti 16GB: 2^n * 16 <= 14GB usable → n ≈ 29 for statevector
        # With cuStateVec optimization: up to ~33 qubits
        # MPS method can go higher: ~50-60 qubits
        usable_vram = self.vram_free_mb * 0.85  # Leave 15% buffer
        max_n = 0
        while (2 ** (max_n + 1)) * 16 / (1024 * 1024) < usable_vram:
            max_n += 1
        return min(max_n, 33)  # Cap at 33 for stability

    def to_dict(self):
        """Serialize GPU config."""
        return {
            'gpu_available': self.gpu_available,
            'cuda_available': self.cuda_available,
            'cuquantum_available': self.cuquantum_available,
            'device_name': self.device_name,
            'device_id': self.device_id,
            'vram_total_mb': self.vram_total_mb,
            'vram_free_mb': self.vram_free_mb,
            'cuda_version': self.cuda_version,
            'compute_capability': self.compute_capability,
            'max_qubits': self.get_max_qubits(),
            'can_accelerate': self.can_accelerate,
        }


# ============================================================================
# Quantum Algorithm Hyperparameters
# ============================================================================
class QuantumParams:
    """Hyperparameters for all quantum algorithms."""

    # QAOA — Quantum Approximate Optimization Algorithm
    QAOA_REPS = 4               # Number of QAOA layers (p parameter)
    QAOA_MAX_ITER = 200         # SPSA optimizer max iterations
    QAOA_NUM_ASSETS = 5         # Max assets for portfolio optimization

    # VQC — Variational Quantum Classifier
    VQC_NUM_QUBITS = 5          # Feature dimension qubits
    VQC_FEATURE_REPS = 2        # ZZFeatureMap repetitions
    VQC_ANSATZ_REPS = 3         # RealAmplitudes layers
    VQC_MAX_ITER = 150          # Training iterations
    VQC_TRAIN_SIZE = 0.8        # Train/test split

    # QSVM — Quantum Support Vector Machine
    QSVM_NUM_QUBITS = 5        # Feature qubits
    QSVM_FEATURE_REPS = 2      # Kernel feature map reps

    # QGAN — Quantum Generative Adversarial Network
    QGAN_LATENT_DIM = 4         # Latent space dimension
    QGAN_NUM_QUBITS = 4         # Generator qubits
    QGAN_EPOCHS = 100           # Training epochs
    QGAN_BATCH_SIZE = 32        # Batch size
    QGAN_SYNTH_SAMPLES = 200    # Synthetic samples to generate

    # QMC — Quantum Monte Carlo
    QMC_NUM_SCENARIOS = 1000    # Monte Carlo scenarios
    QMC_NUM_QUBITS = 4          # Qubits for amplitude estimation
    QMC_TIME_HORIZONS = [1, 5, 10]  # Risk time horizons (days)
    QMC_CONFIDENCE_LEVELS = [0.95, 0.99]  # VaR confidence levels

    # Data parameters
    LOOKBACK_BARS = 200         # OHLCV candle lookback
    FEATURE_COLUMNS = ['open', 'high', 'low', 'close', 'volume']
    SYMBOLS = ['BTC/USDT']      # Tradeable symbols

    # Scheduling
    INTERVAL_MINUTES = int(os.environ.get('QUANTUM_INTERVAL_MIN', '5'))

    # Integration
    BOT_API_URL = os.environ.get('BOT_API_URL', 'http://localhost:3001')
    RESULTS_PUSH = os.environ.get('QUANTUM_PUSH_RESULTS', 'true').lower() == 'true'

    @classmethod
    def adjust_for_gpu(cls, gpu_config: GPUConfig):
        """Scale parameters based on available GPU resources."""
        if gpu_config.can_accelerate:
            max_q = gpu_config.get_max_qubits()
            logger.info(f'GPU mode: max {max_q} qubits, scaling parameters up')

            # Scale up for GPU
            cls.QAOA_REPS = min(6, cls.QAOA_REPS + 2)
            cls.QAOA_MAX_ITER = 300
            cls.VQC_ANSATZ_REPS = min(5, cls.VQC_ANSATZ_REPS + 2)
            cls.VQC_MAX_ITER = 250
            cls.QMC_NUM_SCENARIOS = 5000
            cls.QGAN_EPOCHS = 200
            cls.QGAN_SYNTH_SAMPLES = 500

            # RTX 5070 Ti specific: 16GB VRAM allows larger circuits
            if gpu_config.vram_total_mb >= 16000:
                cls.QMC_NUM_SCENARIOS = 10000
                cls.QAOA_REPS = 8
                cls.VQC_NUM_QUBITS = min(8, max_q)
                cls.QSVM_NUM_QUBITS = min(8, max_q)
                logger.info('RTX 5070 Ti 16GB mode: maximum parameters enabled')
        else:
            logger.info('CPU mode: using conservative parameters')
            cls.QAOA_REPS = 2
            cls.QAOA_MAX_ITER = 100
            cls.VQC_MAX_ITER = 80
            cls.QMC_NUM_SCENARIOS = 500
            cls.QGAN_EPOCHS = 50

    @classmethod
    def to_dict(cls):
        """Serialize all parameters."""
        return {k: v for k, v in vars(cls).items()
                if not k.startswith('_') and not callable(v)}


# ============================================================================
# Global Singleton
# ============================================================================
GPU = GPUConfig()
QuantumParams.adjust_for_gpu(GPU)

if __name__ == '__main__':
    print(json.dumps({
        'gpu': GPU.to_dict(),
        'params': QuantumParams.to_dict(),
        'paths': {
            'quantum_dir': str(QUANTUM_DIR),
            'data_dir': str(DATA_DIR),
            'results_file': str(QUANTUM_RESULTS_FILE),
        }
    }, indent=2, default=str))

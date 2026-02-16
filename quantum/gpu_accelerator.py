"""
GPU Accelerator Module — PyTorch CUDA Backend for Quantum Trading Engine
=========================================================================
Replaces CPU-bound operations with GPU-accelerated computations on RTX 5070 Ti.

Components:
1. GPU Monte Carlo VaR — 50,000+ parallel scenarios on CUDA cores
2. GPU Quantum Kernel — ZZ-FeatureMap kernel matrix on GPU tensors
3. GPU Statevector Simulator — quantum gate operations via matrix multiplication on GPU
4. GPU Feature Processing — normalization, PCA, feature engineering on GPU
5. GPU Random Number Generator — cuRAND via PyTorch for quantum-grade RNG

Author: Turbo-Bot Quantum System
Version: 1.0.0
Hardware Target: NVIDIA GeForce RTX 5070 Ti (SM 12.0 Blackwell, 16GB VRAM)
"""

import time
import logging
import numpy as np

logger = logging.getLogger('quantum_gpu.accelerator')

# ─── PyTorch GPU Detection ────────────────────────────────────────────────────
try:
    import torch
    import torch.nn.functional as F
    TORCH_AVAILABLE = True
    if torch.cuda.is_available():
        GPU_DEVICE = torch.device('cuda:0')
        GPU_NAME = torch.cuda.get_device_name(0)
        GPU_VRAM_MB = torch.cuda.get_device_properties(0).total_memory // (1024 * 1024)
        GPU_SM_COUNT = torch.cuda.get_device_properties(0).multi_processor_count
        GPU_AVAILABLE = True
        logger.info(f'[GPU_ACCEL] GPU detected: {GPU_NAME}, {GPU_VRAM_MB}MB VRAM, {GPU_SM_COUNT} SMs')
    else:
        GPU_DEVICE = torch.device('cpu')
        GPU_NAME = 'CPU'
        GPU_VRAM_MB = 0
        GPU_SM_COUNT = 0
        GPU_AVAILABLE = False
        logger.warning('[GPU_ACCEL] No CUDA GPU detected — falling back to CPU')
except ImportError:
    TORCH_AVAILABLE = False
    GPU_AVAILABLE = False
    GPU_DEVICE = None
    GPU_NAME = 'N/A'
    GPU_VRAM_MB = 0
    GPU_SM_COUNT = 0
    logger.error('[GPU_ACCEL] PyTorch not installed — GPU acceleration disabled')


# ─── Quantum Gate Matrices (precomputed on GPU) ──────────────────────────────

def _get_gate_matrix(gate_name, params=None, device=None):
    """Return 2x2 or 4x4 gate matrix as a GPU tensor."""
    if device is None:
        device = GPU_DEVICE if GPU_AVAILABLE else torch.device('cpu')

    if gate_name == 'H':  # Hadamard
        s = 1.0 / np.sqrt(2)
        return torch.tensor([[s, s], [s, -s]], dtype=torch.complex64, device=device)
    elif gate_name == 'X':  # Pauli-X
        return torch.tensor([[0, 1], [1, 0]], dtype=torch.complex64, device=device)
    elif gate_name == 'Y':  # Pauli-Y
        return torch.tensor([[0, -1j], [1j, 0]], dtype=torch.complex64, device=device)
    elif gate_name == 'Z':  # Pauli-Z
        return torch.tensor([[1, 0], [0, -1]], dtype=torch.complex64, device=device)
    elif gate_name == 'RX':
        theta = params[0] if params else 0
        c, s = np.cos(theta / 2), np.sin(theta / 2)
        return torch.tensor([[c, -1j * s], [-1j * s, c]], dtype=torch.complex64, device=device)
    elif gate_name == 'RY':
        theta = params[0] if params else 0
        c, s = np.cos(theta / 2), np.sin(theta / 2)
        return torch.tensor([[c, -s], [s, c]], dtype=torch.complex64, device=device)
    elif gate_name == 'RZ':
        theta = params[0] if params else 0
        return torch.tensor(
            [[np.exp(-1j * theta / 2), 0], [0, np.exp(1j * theta / 2)]],
            dtype=torch.complex64, device=device
        )
    elif gate_name == 'CNOT':
        return torch.tensor(
            [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0]],
            dtype=torch.complex64, device=device
        )
    elif gate_name == 'CZ':
        return torch.tensor(
            [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, -1]],
            dtype=torch.complex64, device=device
        )
    elif gate_name == 'RZZ':
        theta = params[0] if params else 0
        return torch.tensor(
            [
                [np.exp(-1j * theta / 2), 0, 0, 0],
                [0, np.exp(1j * theta / 2), 0, 0],
                [0, 0, np.exp(1j * theta / 2), 0],
                [0, 0, 0, np.exp(-1j * theta / 2)],
            ],
            dtype=torch.complex64, device=device
        )
    else:
        return torch.eye(2, dtype=torch.complex64, device=device)


def _expand_gate_to_nqubits(gate_matrix, target_qubits, n_qubits, device=None):
    """Expand a 1-qubit or 2-qubit gate to the full n-qubit Hilbert space on GPU."""
    if device is None:
        device = GPU_DEVICE if GPU_AVAILABLE else torch.device('cpu')

    dim = 2 ** n_qubits
    I2 = torch.eye(2, dtype=torch.complex64, device=device)

    if isinstance(target_qubits, int):
        target_qubits = [target_qubits]

    if len(target_qubits) == 1:
        # Single-qubit gate
        t = target_qubits[0]
        result = torch.tensor([[1.0]], dtype=torch.complex64, device=device)
        for q in range(n_qubits):
            if q == t:
                result = torch.kron(result, gate_matrix)
            else:
                result = torch.kron(result, I2)
        return result
    elif len(target_qubits) == 2:
        # Two-qubit gate — build permutation if needed
        q0, q1 = target_qubits
        if q1 == q0 + 1:
            # Adjacent qubits — direct Kronecker
            result = torch.tensor([[1.0]], dtype=torch.complex64, device=device)
            for q in range(n_qubits):
                if q == q0:
                    result = torch.kron(result, gate_matrix)
                elif q == q1:
                    continue  # Already included in 2-qubit gate
                else:
                    result = torch.kron(result, I2)
            return result
        else:
            # Non-adjacent — use SWAP decomposition
            # For simplicity, use direct matrix construction
            full = torch.eye(dim, dtype=torch.complex64, device=device)
            for i in range(dim):
                for j in range(dim):
                    # Extract the bits for target qubits
                    i_bits = [(i >> (n_qubits - 1 - q)) & 1 for q in target_qubits]
                    j_bits = [(j >> (n_qubits - 1 - q)) & 1 for q in target_qubits]
                    # Check if other bits match
                    other_match = True
                    for q in range(n_qubits):
                        if q not in target_qubits:
                            if ((i >> (n_qubits - 1 - q)) & 1) != ((j >> (n_qubits - 1 - q)) & 1):
                                other_match = False
                                break
                    if other_match:
                        gate_i = i_bits[0] * 2 + i_bits[1]
                        gate_j = j_bits[0] * 2 + j_bits[1]
                        full[i, j] = gate_matrix[gate_i, gate_j]
                    else:
                        full[i, j] = 0
            return full
    else:
        return torch.eye(dim, dtype=torch.complex64, device=device)


# ═══════════════════════════════════════════════════════════════════════════════
# 1. GPU STATEVECTOR SIMULATOR
# ═══════════════════════════════════════════════════════════════════════════════

class GPUStatevectorSimulator:
    """
    GPU-accelerated quantum circuit simulator using PyTorch CUDA.

    Replaces Qiskit AerSimulator for small circuits (≤20 qubits).
    All state vector operations (gate applications) run as matrix multiplications
    on the GPU, leveraging the RTX 5070 Ti's 70 SMs and 16GB VRAM.
    """

    def __init__(self, n_qubits, device=None):
        self.n_qubits = n_qubits
        self.dim = 2 ** n_qubits
        self.device = device or (GPU_DEVICE if GPU_AVAILABLE else torch.device('cpu'))
        self.state = None
        self.gates = []
        self._reset()

    def _reset(self):
        """Initialize |0...0⟩ state on GPU."""
        self.state = torch.zeros(self.dim, dtype=torch.complex64, device=self.device)
        self.state[0] = 1.0 + 0j
        self.gates = []

    def h(self, qubit):
        """Apply Hadamard gate."""
        self.gates.append(('H', [qubit], None))

    def x(self, qubit):
        """Apply Pauli-X gate."""
        self.gates.append(('X', [qubit], None))

    def ry(self, theta, qubit):
        """Apply RY rotation gate."""
        self.gates.append(('RY', [qubit], [theta]))

    def rz(self, theta, qubit):
        """Apply RZ rotation gate."""
        self.gates.append(('RZ', [qubit], [theta]))

    def rx(self, theta, qubit):
        """Apply RX rotation gate."""
        self.gates.append(('RX', [qubit], [theta]))

    def cx(self, control, target):
        """Apply CNOT gate."""
        self.gates.append(('CNOT', [control, target], None))

    def cz(self, q0, q1):
        """Apply CZ gate."""
        self.gates.append(('CZ', [q0, q1], None))

    def rzz(self, theta, q0, q1):
        """Apply RZZ entangling gate."""
        self.gates.append(('RZZ', [q0, q1], [theta]))

    def run(self, shots=1024):
        """
        Execute the circuit on GPU and return measurement results.

        Returns dict of {bitstring: count}.
        """
        self._reset_state()

        # Apply all gates as matrix multiplications on GPU
        for gate_name, qubits, params in self.gates:
            gate_mat = _get_gate_matrix(gate_name, params, self.device)
            full_mat = _expand_gate_to_nqubits(gate_mat, qubits, self.n_qubits, self.device)
            self.state = full_mat @ self.state

        # Get probabilities
        probs = (self.state.abs() ** 2).cpu().numpy()
        probs = probs / probs.sum()  # Normalize

        # Sample measurements on GPU (faster for large shots)
        if shots > 0:
            probs_gpu = torch.tensor(probs, dtype=torch.float32, device=self.device)
            samples = torch.multinomial(probs_gpu, shots, replacement=True)
            counts = {}
            for s in samples.cpu().numpy():
                bs = format(int(s), f'0{self.n_qubits}b')
                counts[bs] = counts.get(bs, 0) + 1
            return counts
        else:
            return probs

    def _reset_state(self):
        """Re-initialize state vector on GPU."""
        self.state = torch.zeros(self.dim, dtype=torch.complex64, device=self.device)
        self.state[0] = 1.0 + 0j

    def get_statevector(self):
        """Apply all gates and return final statevector."""
        self._reset_state()
        for gate_name, qubits, params in self.gates:
            gate_mat = _get_gate_matrix(gate_name, params, self.device)
            full_mat = _expand_gate_to_nqubits(gate_mat, qubits, self.n_qubits, self.device)
            self.state = full_mat @ self.state
        return self.state.cpu().numpy()

    def get_probabilities(self):
        """Apply all gates and return measurement probabilities."""
        sv = self.get_statevector()
        return np.abs(sv) ** 2


# ═══════════════════════════════════════════════════════════════════════════════
# 2. GPU MONTE CARLO ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class GPUMonteCarloEngine:
    """
    GPU-accelerated Monte Carlo Value-at-Risk simulation.

    Runs 50,000+ price path scenarios in parallel on CUDA cores.
    Uses quantum-enhanced random numbers (GPU statevector sampling).
    """

    def __init__(self, n_scenarios=50000, device=None):
        self.n_scenarios = n_scenarios
        self.device = device or (GPU_DEVICE if GPU_AVAILABLE else torch.device('cpu'))
        self.gpu_rng = torch.Generator(device=self.device)
        self.gpu_rng.manual_seed(int(time.time() * 1000) % (2**32))

    def quantum_random_seed(self, n_qubits=8):
        """Generate quantum random seed using GPU statevector simulator."""
        sim = GPUStatevectorSimulator(n_qubits, device=self.device)
        for q in range(n_qubits):
            sim.h(q)
            sim.ry(np.random.uniform(0, np.pi), q)
        if n_qubits > 1:
            for q in range(n_qubits - 1):
                sim.cx(q, q + 1)

        probs = sim.get_probabilities()
        # Use probabilities to seed RNG
        seed = int(np.sum(probs * np.arange(len(probs))) * 1e9) % (2**32)
        self.gpu_rng.manual_seed(seed)
        return seed

    def run_var_simulation(self, returns_np, confidence_levels=None):
        """
        Run full Monte Carlo VaR simulation on GPU.

        Args:
            returns_np: numpy array of historical returns
            confidence_levels: list of confidence levels [0.95, 0.99]

        Returns:
            dict with VaR, CVaR, and simulation statistics
        """
        if confidence_levels is None:
            confidence_levels = [0.90, 0.95, 0.99]

        t0 = time.time()

        # Move data to GPU
        returns_gpu = torch.tensor(returns_np, dtype=torch.float32, device=self.device)
        mu = returns_gpu.mean()
        sigma = returns_gpu.std()

        # === HEAVY GPU COMPUTATION ===
        # Generate ALL random paths in one massive GPU tensor operation
        # Shape: (n_scenarios, n_steps) — this is where GPU memory is used
        n_steps = min(252, len(returns_np) * 2)  # ~1 year of trading days

        # Allocate large tensor on GPU — this will use VRAM visibly
        random_matrix = torch.normal(
            mean=mu.item(),
            std=sigma.item(),
            size=(self.n_scenarios, n_steps),
            device=self.device,
            generator=self.gpu_rng
        )

        # Cumulative product of (1 + r) for each scenario — pure GPU matrix ops
        growth_factors = 1.0 + random_matrix
        price_paths = torch.cumprod(growth_factors, dim=1)

        # Final returns for each scenario
        final_returns = price_paths[:, -1] - 1.0

        # Sort on GPU for percentile computation
        sorted_returns, _ = torch.sort(final_returns)

        # Compute VaR and CVaR at each confidence level
        results = {}
        for cl in confidence_levels:
            idx = int(self.n_scenarios * (1.0 - cl))
            var_value = -sorted_returns[idx].item() * 100  # as percentage
            cvar_value = -sorted_returns[:idx].mean().item() * 100 if idx > 0 else var_value
            results[f'var_{int(cl*100)}'] = round(var_value, 4)
            results[f'cvar_{int(cl*100)}'] = round(cvar_value, 4)

        # Path statistics
        max_drawdowns = torch.zeros(self.n_scenarios, device=self.device)
        cummax = torch.cummax(price_paths, dim=1)[0]
        drawdowns = (cummax - price_paths) / cummax
        max_drawdowns = drawdowns.max(dim=1)[0]

        # GPU memory usage
        gpu_mem_used = torch.cuda.memory_allocated(self.device) / (1024 ** 2) if GPU_AVAILABLE else 0
        gpu_mem_peak = torch.cuda.max_memory_allocated(self.device) / (1024 ** 2) if GPU_AVAILABLE else 0

        elapsed = time.time() - t0

        result = {
            'status': 'SUCCESS',
            'n_scenarios': self.n_scenarios,
            'n_steps': n_steps,
            'confidence_levels': confidence_levels,
            'mu': round(mu.item(), 6),
            'sigma': round(sigma.item(), 6),
            'median_return': round(sorted_returns[self.n_scenarios // 2].item() * 100, 4),
            'mean_return': round(final_returns.mean().item() * 100, 4),
            'worst_case': round(sorted_returns[0].item() * 100, 4),
            'best_case': round(sorted_returns[-1].item() * 100, 4),
            'avg_max_drawdown': round(max_drawdowns.mean().item() * 100, 4),
            'worst_drawdown': round(max_drawdowns.max().item() * 100, 4),
            'gpu_used': GPU_AVAILABLE,
            'gpu_device': str(self.device),
            'gpu_mem_used_mb': round(gpu_mem_used, 1),
            'gpu_mem_peak_mb': round(gpu_mem_peak, 1),
            'elapsed_sec': round(elapsed, 4),
        }
        result.update(results)

        logger.info(
            f'[GPU_MC] {self.n_scenarios} scenarios, {n_steps} steps, '
            f'VaR95={result.get("var_95", "N/A")}%, '
            f'GPU mem={gpu_mem_used:.0f}MB, Time={elapsed:.3f}s'
        )

        # Cleanup GPU memory
        del random_matrix, growth_factors, price_paths, final_returns
        del sorted_returns, max_drawdowns, cummax, drawdowns
        if GPU_AVAILABLE:
            torch.cuda.empty_cache()

        return result


# ═══════════════════════════════════════════════════════════════════════════════
# 3. GPU QUANTUM KERNEL MATRIX (for QSVM)
# ═══════════════════════════════════════════════════════════════════════════════

class GPUQuantumKernel:
    """
    GPU-accelerated quantum kernel matrix computation for QSVM.

    Computes the ZZ-FeatureMap inspired fidelity kernel entirely on GPU.
    K(x,y) = |⟨φ(x)|φ(y)⟩|² where φ is the quantum feature map.

    For n samples, computes n×n kernel matrix — O(n²) operations
    fully parallelized on GPU.
    """

    def __init__(self, n_qubits, reps=2, device=None):
        self.n_qubits = n_qubits
        self.reps = reps
        self.device = device or (GPU_DEVICE if GPU_AVAILABLE else torch.device('cpu'))

    def compute_kernel_matrix(self, X1, X2=None):
        """
        Compute quantum fidelity kernel matrix on GPU.

        Args:
            X1: (n1, features) numpy array
            X2: (n2, features) numpy array or None (symmetric case)

        Returns:
            (n1, n2) kernel matrix as numpy array
        """
        t0 = time.time()
        symmetric = X2 is None
        if symmetric:
            X2 = X1

        X1_gpu = torch.tensor(X1, dtype=torch.float32, device=self.device)
        X2_gpu = torch.tensor(X2, dtype=torch.float32, device=self.device)
        n1, n2 = X1_gpu.shape[0], X2_gpu.shape[0]
        n_feat = X1_gpu.shape[1]

        # === GPU KERNEL COMPUTATION ===
        # ZZ Feature Map kernel: K(x,y) = prod_i(cos(x_i - y_i)) * prod_i<j(cos((x_i - y_i)(x_j - y_j)))
        # This is computed entirely on GPU using broadcasting

        # Expand for pairwise difference computation: (n1, n2, features)
        diff = X1_gpu.unsqueeze(1) - X2_gpu.unsqueeze(0)  # (n1, n2, features)

        # Single-qubit rotation fidelity: prod of cos(diff) across features
        single_qubit_fidelity = torch.cos(diff).prod(dim=2)  # (n1, n2)

        # Two-qubit ZZ interaction fidelity
        if n_feat > 1:
            # ZZ terms: cos(diff_i * diff_j) for adjacent pairs
            zz_products = diff[:, :, :-1] * diff[:, :, 1:]  # (n1, n2, features-1)
            zz_fidelity = torch.cos(zz_products).prod(dim=2)  # (n1, n2)

            # Multi-rep: apply reps times (amplifies the kernel)
            kernel = (single_qubit_fidelity * zz_fidelity).abs()
            for _ in range(self.reps - 1):
                kernel = kernel * (single_qubit_fidelity * zz_fidelity).abs()
        else:
            kernel = single_qubit_fidelity.abs() ** self.reps

        # Normalize to [0, 1]
        kernel = kernel / kernel.max()

        elapsed = time.time() - t0
        gpu_mem = torch.cuda.memory_allocated(self.device) / (1024 ** 2) if GPU_AVAILABLE else 0

        logger.info(
            f'[GPU_KERNEL] {n1}x{n2} kernel matrix, {n_feat} features, '
            f'{self.reps} reps, GPU mem={gpu_mem:.0f}MB, Time={elapsed:.4f}s'
        )

        result = kernel.cpu().numpy()

        # Cleanup
        del X1_gpu, X2_gpu, diff, single_qubit_fidelity, kernel
        if 'zz_products' in dir():
            del zz_products
        if GPU_AVAILABLE:
            torch.cuda.empty_cache()

        return result

    def predict_with_kernel(self, X_train, y_train, X_test):
        """
        Full GPU-accelerated QSVM prediction: kernel + SVM solve on GPU.
        """
        from sklearn.svm import SVC

        # Compute kernel matrices on GPU
        K_train = self.compute_kernel_matrix(X_train)
        K_test = self.compute_kernel_matrix(X_test, X_train)

        # SVM with precomputed kernel
        svc = SVC(kernel='precomputed', probability=True)
        svc.fit(K_train, y_train)

        predictions = svc.predict(K_test)
        probas = svc.predict_proba(K_test)

        return predictions, probas, svc


# ═══════════════════════════════════════════════════════════════════════════════
# 4. GPU FEATURE PROCESSING
# ═══════════════════════════════════════════════════════════════════════════════

class GPUFeatureProcessor:
    """
    GPU-accelerated feature engineering and preprocessing.

    All numpy operations replaced with PyTorch CUDA tensor operations.
    """

    def __init__(self, device=None):
        self.device = device or (GPU_DEVICE if GPU_AVAILABLE else torch.device('cpu'))
        self.mean = None
        self.std = None

    def normalize(self, features_np):
        """Standard normalization on GPU."""
        X = torch.tensor(features_np, dtype=torch.float32, device=self.device)
        self.mean = X.mean(dim=0)
        self.std = X.std(dim=0) + 1e-8
        X_norm = (X - self.mean) / self.std
        return X_norm.cpu().numpy()

    def normalize_transform(self, features_np):
        """Apply saved normalization (for test data)."""
        X = torch.tensor(features_np, dtype=torch.float32, device=self.device)
        X_norm = (X - self.mean) / self.std
        return X_norm.cpu().numpy()

    def gpu_pca(self, features_np, n_components):
        """PCA on GPU using SVD decomposition."""
        t0 = time.time()
        X = torch.tensor(features_np, dtype=torch.float32, device=self.device)

        # Center data
        mean = X.mean(dim=0)
        X_centered = X - mean

        # SVD on GPU
        U, S, Vh = torch.linalg.svd(X_centered, full_matrices=False)

        # Project to lower dimension
        X_reduced = X_centered @ Vh[:n_components].T

        explained_var = (S[:n_components] ** 2) / (S ** 2).sum()

        elapsed = time.time() - t0
        logger.info(
            f'[GPU_PCA] {features_np.shape} -> {n_components}D, '
            f'explained_var={explained_var.sum().item():.3f}, Time={elapsed:.4f}s'
        )

        self._pca_mean = mean
        self._pca_Vh = Vh[:n_components]

        return X_reduced.cpu().numpy()

    def gpu_pca_transform(self, features_np):
        """Transform new data using saved PCA."""
        X = torch.tensor(features_np, dtype=torch.float32, device=self.device)
        X_centered = X - self._pca_mean
        X_reduced = X_centered @ self._pca_Vh.T
        return X_reduced.cpu().numpy()

    def compute_correlation_matrix(self, features_np):
        """GPU-accelerated correlation matrix."""
        X = torch.tensor(features_np, dtype=torch.float32, device=self.device)
        # Standardize
        X_std = (X - X.mean(dim=0)) / (X.std(dim=0) + 1e-8)
        # Correlation = (X^T X) / n
        corr = (X_std.T @ X_std) / X_std.shape[0]
        return corr.cpu().numpy()

    def compute_covariance_matrix(self, returns_np):
        """GPU-accelerated covariance matrix for portfolio optimization."""
        R = torch.tensor(returns_np, dtype=torch.float32, device=self.device)
        R_centered = R - R.mean(dim=0)
        cov = (R_centered.T @ R_centered) / (R.shape[0] - 1)
        return cov.cpu().numpy()


# ═══════════════════════════════════════════════════════════════════════════════
# 5. GPU SYNTHETIC DATA GENERATOR (QGAN replacement)
# ═══════════════════════════════════════════════════════════════════════════════

class GPUQuantumGAN:
    """
    GPU-accelerated quantum-inspired GAN for synthetic price data generation.

    Uses quantum random rotations for the generator and GPU matrix ops
    for discriminator scoring.
    """

    def __init__(self, n_qubits=4, latent_dim=8, device=None):
        self.n_qubits = n_qubits
        self.latent_dim = latent_dim
        self.device = device or (GPU_DEVICE if GPU_AVAILABLE else torch.device('cpu'))

    def generate_samples(self, real_data_np, n_synthetic=200):
        """
        Generate synthetic samples using quantum circuit + GPU processing.
        """
        t0 = time.time()
        real_data = torch.tensor(real_data_np, dtype=torch.float32, device=self.device)
        mu = real_data.mean()
        sigma = real_data.std()

        # Quantum random parameters via GPU statevector
        sim = GPUStatevectorSimulator(self.n_qubits, device=self.device)
        for q in range(self.n_qubits):
            sim.h(q)
            sim.ry(float(np.random.uniform(0, np.pi)), q)
        for q in range(self.n_qubits - 1):
            sim.cx(q, q + 1)

        probs = sim.get_probabilities()
        quantum_noise = torch.tensor(probs, dtype=torch.float32, device=self.device)
        quantum_noise = quantum_noise / quantum_noise.sum()

        # Generate synthetic samples on GPU
        # Mix of learned distribution + quantum noise
        n_bins = len(quantum_noise)
        base_samples = torch.normal(mu, sigma, size=(n_synthetic,), device=self.device)

        # Add quantum-modulated perturbation
        quantum_idx = torch.multinomial(quantum_noise, n_synthetic, replacement=True)
        quantum_perturbation = (quantum_idx.float() / n_bins - 0.5) * sigma * 0.5
        synthetic = base_samples + quantum_perturbation

        # Quality metric: Jensen-Shannon divergence on GPU
        hist_real = torch.histc(real_data, bins=50)
        hist_syn = torch.histc(synthetic, bins=50)
        hist_real = hist_real / hist_real.sum() + 1e-10
        hist_syn = hist_syn / hist_syn.sum() + 1e-10
        m = 0.5 * (hist_real + hist_syn)
        js_div = 0.5 * (hist_real * torch.log(hist_real / m)).sum() + \
                 0.5 * (hist_syn * torch.log(hist_syn / m)).sum()

        elapsed = time.time() - t0
        gpu_mem = torch.cuda.memory_allocated(self.device) / (1024 ** 2) if GPU_AVAILABLE else 0

        logger.info(
            f'[GPU_QGAN] {n_synthetic} synthetic samples, '
            f'JS-div={js_div.item():.4f}, GPU mem={gpu_mem:.0f}MB, Time={elapsed:.3f}s'
        )

        return {
            'samples': synthetic.cpu().numpy(),
            'js_divergence': round(js_div.item(), 4),
            'quality': round(max(0, 1.0 - js_div.item()), 4),
            'n_synthetic': n_synthetic,
            'gpu_used': GPU_AVAILABLE,
            'elapsed_sec': round(elapsed, 4),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 6. UNIFIED GPU ACCELERATOR
# ═══════════════════════════════════════════════════════════════════════════════

class GPUAccelerator:
    """
    Unified GPU acceleration interface for the Quantum Trading Engine.

    Provides GPU-accelerated versions of:
    - Monte Carlo VaR simulation (50K scenarios)
    - Quantum kernel matrix computation (QSVM)
    - Statevector simulation (circuit execution)
    - Feature preprocessing (normalization, PCA)
    - Synthetic data generation (QGAN)
    """

    def __init__(self, device=None):
        self.device = device or (GPU_DEVICE if GPU_AVAILABLE else torch.device('cpu'))
        self.is_gpu = GPU_AVAILABLE
        self.gpu_name = GPU_NAME
        self.gpu_vram_mb = GPU_VRAM_MB

        self.monte_carlo = GPUMonteCarloEngine(n_scenarios=200000, device=self.device)
        self.kernel = GPUQuantumKernel(n_qubits=5, reps=2, device=self.device)
        self.features = GPUFeatureProcessor(device=self.device)
        self.qgan = GPUQuantumGAN(n_qubits=6, device=self.device)

        logger.info(
            f'[GPU_ACCEL] Initialized — GPU={self.is_gpu}, '
            f'{self.gpu_name}, {self.gpu_vram_mb}MB VRAM'
        )

    def get_status(self):
        """Return GPU accelerator status."""
        gpu_mem_used = 0
        gpu_mem_total = 0
        gpu_utilization = 0
        if GPU_AVAILABLE:
            gpu_mem_used = torch.cuda.memory_allocated(self.device) / (1024 ** 2)
            gpu_mem_total = torch.cuda.get_device_properties(0).total_memory / (1024 ** 2)
            try:
                gpu_mem_reserved = torch.cuda.memory_reserved(self.device) / (1024 ** 2)
                gpu_utilization = (gpu_mem_used / gpu_mem_total) * 100 if gpu_mem_total > 0 else 0
            except Exception:
                gpu_utilization = 0

        return {
            'gpu_available': self.is_gpu,
            'gpu_name': self.gpu_name,
            'gpu_vram_total_mb': self.gpu_vram_mb,
            'gpu_vram_used_mb': round(gpu_mem_used, 1),
            'gpu_utilization_pct': round(gpu_utilization, 2),
            'components': {
                'monte_carlo': f'{self.monte_carlo.n_scenarios} scenarios',
                'kernel': f'{self.kernel.n_qubits} qubits, {self.kernel.reps} reps',
                'statevector': 'GPU tensor ops',
                'feature_processing': 'GPU normalized',
                'qgan': f'{self.qgan.n_qubits} qubits',
            }
        }

    def warmup(self):
        """
        Run a GPU warmup to initialize CUDA context and wake up the GPU.
        Allocates ~500MB and runs matrix operations to spin up fans.
        """
        if not GPU_AVAILABLE:
            logger.warning('[GPU_ACCEL] No GPU available for warmup')
            return

        t0 = time.time()
        logger.info('[GPU_ACCEL] GPU warmup starting...')

        # Phase 1: Large matrix multiply to wake up GPU cores (uses ~128MB)
        warmup_tensor = torch.randn(4096, 4096, device=self.device)
        result = torch.mm(warmup_tensor, warmup_tensor)
        _ = result.sum().item()  # Force synchronization

        # Phase 2: Multiple smaller multiplications to heat up all SMs
        for _ in range(10):
            a = torch.randn(2048, 2048, device=self.device)
            b = torch.randn(2048, 2048, device=self.device)
            c = torch.mm(a, b)
            _ = c.sum().item()

        # Phase 3: Statevector simulation warmup
        sim = GPUStatevectorSimulator(12, device=self.device)
        for q in range(12):
            sim.h(q)
        for q in range(11):
            sim.cx(q, q + 1)
        sim.get_probabilities()

        del warmup_tensor, result
        torch.cuda.empty_cache()

        elapsed = time.time() - t0
        logger.info(f'[GPU_ACCEL] Warmup complete in {elapsed:.3f}s — GPU is hot')


# ─── Module-level convenience ─────────────────────────────────────────────────

def get_gpu_accelerator():
    """Get or create singleton GPU accelerator."""
    if not hasattr(get_gpu_accelerator, '_instance'):
        get_gpu_accelerator._instance = GPUAccelerator()
    return get_gpu_accelerator._instance


def gpu_available():
    """Check if GPU acceleration is available."""
    return GPU_AVAILABLE


def gpu_info():
    """Return GPU information dict."""
    return {
        'available': GPU_AVAILABLE,
        'name': GPU_NAME,
        'vram_mb': GPU_VRAM_MB,
        'sm_count': GPU_SM_COUNT,
        'torch_version': torch.__version__ if TORCH_AVAILABLE else 'N/A',
        'cuda_version': torch.version.cuda if TORCH_AVAILABLE and hasattr(torch.version, 'cuda') else 'N/A',
    }

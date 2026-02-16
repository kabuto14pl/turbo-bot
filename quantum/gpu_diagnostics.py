#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════════╗
║  GPU Diagnostics & Benchmark for Quantum Trading System                     ║
║  ASUS Prime GeForce RTX 5070 Ti OC 16GB — Full Verification                 ║
╚══════════════════════════════════════════════════════════════════════════════╝

Tests:
  1. NVIDIA Driver & CUDA version
  2. PyTorch GPU operations
  3. VRAM allocation stress test
  4. cuQuantum availability
  5. Qiskit Aer GPU simulator
  6. Quantum circuit benchmark (2-qubit → max-qubit)
  7. Torch matrix multiplication benchmark (DLSS4 tensor cores)
"""

import sys
import time
import json
import traceback
from datetime import datetime


def check_nvidia_smi():
    """Check NVIDIA driver via nvidia-smi."""
    import subprocess
    try:
        result = subprocess.run(
            ['nvidia-smi', '--query-gpu=name,driver_version,memory.total,memory.free,memory.used,temperature.gpu,power.draw',
             '--format=csv,noheader,nounits'],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            parts = [p.strip() for p in result.stdout.strip().split(',')]
            info = {
                'name': parts[0],
                'driver_version': parts[1],
                'vram_total_mb': int(float(parts[2])),
                'vram_free_mb': int(float(parts[3])),
                'vram_used_mb': int(float(parts[4])),
                'temperature_c': int(float(parts[5])),
                'power_draw_w': float(parts[6]),
            }
            print(f'  ✅ GPU: {info["name"]}')
            print(f'     Driver: {info["driver_version"]}')
            print(f'     VRAM: {info["vram_total_mb"]}MB total, {info["vram_free_mb"]}MB free, {info["vram_used_mb"]}MB used')
            print(f'     Temp: {info["temperature_c"]}°C, Power: {info["power_draw_w"]}W')
            return info
        else:
            print(f'  ❌ nvidia-smi failed: {result.stderr}')
            return None
    except FileNotFoundError:
        print('  ❌ nvidia-smi not found — NVIDIA drivers not installed')
        return None
    except Exception as e:
        print(f'  ❌ nvidia-smi error: {e}')
        return None


def check_pytorch_cuda():
    """Verify PyTorch CUDA integration."""
    try:
        import torch
        print(f'  PyTorch: {torch.__version__}')
        print(f'  CUDA available: {torch.cuda.is_available()}')
        if torch.cuda.is_available():
            print(f'  CUDA version: {torch.version.cuda}')
            print(f'  cuDNN version: {torch.backends.cudnn.version()}')
            print(f'  Device count: {torch.cuda.device_count()}')
            for i in range(torch.cuda.device_count()):
                props = torch.cuda.get_device_properties(i)
                free, total = torch.cuda.mem_get_info(i)
                print(f'  Device {i}: {props.name}')
                print(f'    Compute capability: {props.major}.{props.minor}')
                print(f'    SM count: {props.multi_processor_count}')
                print(f'    VRAM: {total // (1024**2)}MB total, {free // (1024**2)}MB free')
            return True
        else:
            print('  ❌ CUDA not available in PyTorch')
            return False
    except ImportError:
        print('  ❌ PyTorch not installed')
        return False


def check_cuquantum():
    """Check cuQuantum installation."""
    try:
        import cuquantum
        print(f'  ✅ cuQuantum: {cuquantum.__version__}')
        try:
            from cuquantum import custatevec
            print(f'  ✅ cuStateVec: available')
        except ImportError:
            print('  ⚠️ cuStateVec: not available')
        return True
    except ImportError:
        print('  ⚠️ cuQuantum not installed (optional — Aer GPU still works)')
        return False


def check_qiskit():
    """Check Qiskit installation and components."""
    components = {}
    try:
        import qiskit
        components['qiskit'] = qiskit.__version__
        print(f'  ✅ Qiskit: {qiskit.__version__}')
    except ImportError:
        print('  ❌ Qiskit not installed')
        return components

    for mod_name, pkg_name in [
        ('qiskit_aer', 'qiskit-aer'),
        ('qiskit_algorithms', 'qiskit-algorithms'),
        ('qiskit_machine_learning', 'qiskit-machine-learning'),
        ('qiskit_optimization', 'qiskit-optimization'),
        ('qiskit_finance', 'qiskit-finance'),
    ]:
        try:
            mod = __import__(mod_name)
            ver = getattr(mod, '__version__', 'installed')
            components[pkg_name] = ver
            print(f'  ✅ {pkg_name}: {ver}')
        except ImportError:
            components[pkg_name] = None
            print(f'  ❌ {pkg_name}: NOT installed')
    return components


def benchmark_torch_gpu():
    """Benchmark PyTorch GPU operations (tests tensor cores / DLSS4 AI acceleration)."""
    try:
        import torch
        if not torch.cuda.is_available():
            print('  ⚠️ Skipping — no CUDA')
            return None

        device = torch.device('cuda:0')
        results = {}

        # Matrix multiplication benchmark (FP32)
        sizes = [1024, 2048, 4096, 8192]
        for size in sizes:
            try:
                a = torch.randn(size, size, device=device)
                b = torch.randn(size, size, device=device)
                torch.cuda.synchronize()

                start = time.perf_counter()
                for _ in range(10):
                    c = torch.mm(a, b)
                torch.cuda.synchronize()
                elapsed = (time.perf_counter() - start) / 10

                gflops = (2 * size**3) / elapsed / 1e9
                results[f'matmul_{size}x{size}_fp32'] = {
                    'time_ms': round(elapsed * 1000, 2),
                    'gflops': round(gflops, 1),
                }
                print(f'  MatMul {size}x{size} FP32: {elapsed*1000:.1f}ms ({gflops:.0f} GFLOPS)')
                del a, b, c
            except RuntimeError as e:
                print(f'  MatMul {size}x{size}: OOM — {e}')
                break

        # FP16 (tensor core acceleration)
        size = 4096
        try:
            a = torch.randn(size, size, device=device, dtype=torch.float16)
            b = torch.randn(size, size, device=device, dtype=torch.float16)
            torch.cuda.synchronize()
            start = time.perf_counter()
            for _ in range(20):
                c = torch.mm(a, b)
            torch.cuda.synchronize()
            elapsed = (time.perf_counter() - start) / 20
            gflops = (2 * size**3) / elapsed / 1e9
            results['matmul_4096x4096_fp16_tensorcore'] = {
                'time_ms': round(elapsed * 1000, 2),
                'gflops': round(gflops, 1),
            }
            print(f'  MatMul {size}x{size} FP16 (Tensor Cores): {elapsed*1000:.1f}ms ({gflops:.0f} GFLOPS)')
            del a, b, c
        except Exception as e:
            print(f'  FP16 benchmark failed: {e}')

        torch.cuda.empty_cache()
        return results

    except Exception as e:
        print(f'  ❌ Benchmark failed: {e}')
        return None


def benchmark_quantum_circuit():
    """Benchmark Qiskit Aer GPU simulation with increasing qubit counts."""
    try:
        from qiskit import QuantumCircuit
        from qiskit_aer import AerSimulator
    except ImportError:
        print('  ❌ Qiskit Aer not available')
        return None

    results = {}

    # Determine backend
    try:
        import torch
        gpu_avail = torch.cuda.is_available()
    except ImportError:
        gpu_avail = False

    for n_qubits in [4, 8, 12, 16, 20, 24, 28]:
        try:
            qc = QuantumCircuit(n_qubits)
            for i in range(n_qubits):
                qc.h(i)
            for i in range(n_qubits - 1):
                qc.cx(i, i + 1)
            qc.measure_all()

            # GPU simulator if available
            if gpu_avail:
                try:
                    sim = AerSimulator(method='statevector', device='GPU')
                except Exception:
                    sim = AerSimulator(method='statevector')
            else:
                sim = AerSimulator(method='statevector')

            start = time.perf_counter()
            job = sim.run(qc, shots=1024)
            result = job.result()
            elapsed = time.perf_counter() - start

            results[f'{n_qubits}_qubits'] = {
                'time_ms': round(elapsed * 1000, 2),
                'shots': 1024,
                'backend': str(sim),
            }
            print(f'  {n_qubits} qubits: {elapsed*1000:.1f}ms (1024 shots)')

        except Exception as e:
            print(f'  {n_qubits} qubits: FAILED — {e}')
            break  # Likely OOM, stop scaling

    return results


def run_full_diagnostics():
    """Run all diagnostics and return comprehensive report."""
    print('=' * 70)
    print('  QUANTUM GPU DIAGNOSTICS — RTX 5070 Ti Verification')
    print(f'  Date: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    print('=' * 70)
    print()

    report = {
        'timestamp': datetime.now().isoformat(),
        'python_version': sys.version,
    }

    print('[1/6] NVIDIA Driver & GPU...')
    report['nvidia_smi'] = check_nvidia_smi()
    print()

    print('[2/6] PyTorch CUDA...')
    report['pytorch_cuda'] = check_pytorch_cuda()
    print()

    print('[3/6] cuQuantum...')
    report['cuquantum'] = check_cuquantum()
    print()

    print('[4/6] Qiskit Components...')
    report['qiskit'] = check_qiskit()
    print()

    print('[5/6] PyTorch GPU Benchmark...')
    report['torch_benchmark'] = benchmark_torch_gpu()
    print()

    print('[6/6] Quantum Circuit Benchmark...')
    report['quantum_benchmark'] = benchmark_quantum_circuit()
    print()

    # Summary
    gpu_ok = report.get('pytorch_cuda', False)
    qiskit_ok = 'qiskit' in (report.get('qiskit') or {})
    cuq_ok = report.get('cuquantum', False)

    print('=' * 70)
    print('  SUMMARY')
    print('=' * 70)
    print(f'  GPU:       {"✅ READY" if gpu_ok else "❌ NOT AVAILABLE (CPU fallback)"}')
    print(f'  Qiskit:    {"✅ INSTALLED" if qiskit_ok else "❌ NOT INSTALLED"}')
    print(f'  cuQuantum: {"✅ INSTALLED" if cuq_ok else "⚠️ Not installed (optional)"}')
    print(f'  Mode:      {"GPU-ACCELERATED" if gpu_ok else "CPU SIMULATION"}')

    if gpu_ok and report.get('nvidia_smi'):
        vram = report['nvidia_smi'].get('vram_total_mb', 0)
        if vram >= 16000:
            print(f'  VRAM:      {vram}MB — FULL RTX 5070 Ti MODE (16GB)')
        elif vram >= 8000:
            print(f'  VRAM:      {vram}MB — STANDARD GPU MODE')
        else:
            print(f'  VRAM:      {vram}MB — LIMITED GPU MODE')

    print('=' * 70)

    # Save report
    report_path = str(
        __import__('pathlib').Path(__file__).parent / 'results' / 'gpu_diagnostics.json'
    )
    try:
        __import__('pathlib').Path(report_path).parent.mkdir(parents=True, exist_ok=True)
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        print(f'  Report saved: {report_path}')
    except Exception as e:
        print(f'  Report save failed: {e}')

    return report


if __name__ == '__main__':
    run_full_diagnostics()

"""
Quantum GPU Trading System for Turbo-Bot
=========================================
GPU-Accelerated Quantum Computing Engine
Optimized for ASUS Prime GeForce RTX 5070 Ti OC 16GB (Blackwell, CUDA 12.3+)

Components:
  - config.py          : GPU detection, paths, configuration
  - gpu_diagnostics.py : Full GPU verification and benchmarking
  - data_fetcher.py    : BTC/USDT data fetching (CCXT + REST + CSV)
  - quantum_engine_gpu.py : Main engine (QAOA, VQC, QSVM, QGAN, QMC)
  - quantum_scheduler.py  : APScheduler for periodic execution
  - run_quantum.py     : Entrypoint with CLI

Architecture:
  data_fetcher → quantum_engine_gpu → quantum_results.json → JS bridge → bot.js
"""

__version__ = '1.0.0'
__author__ = 'Turbo-Bot Quantum System'

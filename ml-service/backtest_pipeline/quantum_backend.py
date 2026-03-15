"""
Turbo-Bot Full Pipeline Backtest — Quantum Backend Abstraction

Phase A introduced the stable backend contract.
Phase B adds real `remote-gpu` and `hybrid-verify` implementations on top of
the same runner and engine workflow.
"""

from __future__ import annotations

import os
import time
from abc import ABC, abstractmethod

import numpy as np

from . import config
from .quantum_fidelity_replay import (
    RemoteGPUReplayClient,
    build_features,
    build_strategy_metrics,
    qmc_bias_from_remote,
    qmc_prob_positive_from_remote,
    var_proxy_from_remote,
    weight_correlation,
)
from .quantum_sim import QuantumPipelineSimulator


SUPPORTED_QUANTUM_BACKENDS = ('simulated', 'remote-gpu', 'hybrid-verify')
DEFAULT_REMOTE_URL = os.environ.get('QUANTUM_GPU_REMOTE_URL') or os.environ.get('GPU_REMOTE_URL') or 'http://127.0.0.1:4000'
DEFAULT_REMOTE_TIMEOUT_S = float(os.environ.get('QUANTUM_GPU_TIMEOUT_S', '5.0'))
DEFAULT_VERIFY_SAMPLE_RATE = float(os.environ.get('QUANTUM_VERIFY_SAMPLE_RATE', '0.1'))
DEFAULT_REMOTE_INIT_WAIT_S = float(os.environ.get('QUANTUM_GPU_INIT_WAIT_S', '90.0'))
DEFAULT_REMOTE_RECOVERY_WAIT_S = float(os.environ.get('QUANTUM_GPU_RECOVERY_WAIT_S', '90.0'))
DEFAULT_REMOTE_HEALTH_POLL_S = float(os.environ.get('QUANTUM_GPU_HEALTH_POLL_S', '2.0'))
DEFAULT_REMOTE_OPERATION_ATTEMPTS = max(1, int(os.environ.get('QUANTUM_GPU_OPERATION_ATTEMPTS', '2')))


class QuantumBackend(ABC):
    def __init__(self, backend_name: str, options: dict | None = None):
        self.backend_name = backend_name
        self.options = options or {}

    @abstractmethod
    def process_cycle(self, row, history_df, regime, signals, portfolio_value):
        pass

    @abstractmethod
    def verify_decision(self, consensus, confidence, regime, qra_score):
        pass

    @abstractmethod
    def get_stats(self):
        pass


class SimulatedQuantumBackend(QuantumBackend):
    def __init__(self, options: dict | None = None):
        super().__init__('simulated', options=options)
        self._simulator = QuantumPipelineSimulator()

    def process_cycle(self, row, history_df, regime, signals, portfolio_value):
        return self._simulator.process_cycle(row, history_df, regime, signals, portfolio_value)

    def verify_decision(self, consensus, confidence, regime, qra_score):
        return self._simulator.verify_decision(consensus, confidence, regime, qra_score)

    def get_stats(self):
        stats = dict(self._simulator.get_stats())
        stats['backend'] = self.backend_name
        return stats


class _RemoteQuantumMixin:
    def _init_remote_support(self):
        self.remote_url = self.options.get('remote_url') or DEFAULT_REMOTE_URL
        self.remote_timeout_s = float(self.options.get('timeout_s', DEFAULT_REMOTE_TIMEOUT_S))
        self.verify_sample_rate = float(self.options.get('verify_sample_rate', DEFAULT_VERIFY_SAMPLE_RATE))
        self.verify_sample_rate = min(1.0, max(0.0, self.verify_sample_rate))
        self.max_strategies = int(self.options.get('max_strategies', 5))
        self.remote_init_wait_s = max(0.0, float(self.options.get('init_wait_s', DEFAULT_REMOTE_INIT_WAIT_S)))
        self.remote_recovery_wait_s = max(0.0, float(self.options.get('recovery_wait_s', DEFAULT_REMOTE_RECOVERY_WAIT_S)))
        self.remote_health_poll_s = max(0.25, float(self.options.get('health_poll_s', DEFAULT_REMOTE_HEALTH_POLL_S)))
        self.remote_operation_attempts = max(1, int(self.options.get('operation_attempts', DEFAULT_REMOTE_OPERATION_ATTEMPTS)))
        self._remote_client = RemoteGPUReplayClient(self.remote_url, timeout_s=self.remote_timeout_s)
        self._remote_stats = {
            'remote_url': self.remote_url,
            'remote_timeout_s': self.remote_timeout_s,
            'health_status': 'unknown',
            'health_checks': 0,
            'remote_qmc_calls': 0,
            'remote_qaoa_calls': 0,
            'remote_vqc_calls': 0,
            'remote_failures': 0,
            'remote_qmc_compute_ms': 0.0,
            'remote_qaoa_compute_ms': 0.0,
            'remote_vqc_compute_ms': 0.0,
            'last_remote_regime': None,
            'last_remote_regime_confidence': None,
            'verify_sample_rate': self.verify_sample_rate,
            'verify_qmc_samples': 0,
            'verify_qmc_matches': 0,
            'verify_regime_samples': 0,
            'verify_regime_matches': 0,
            'verify_qaoa_samples': 0,
            'verify_qaoa_corr_sum': 0.0,
        }
        self._sample_events = {'qmc': 0, 'qaoa': 0, 'vqc': 0}

    def _safe_float(self, value, default):
        try:
            if value is None:
                return default
            return float(value)
        except (TypeError, ValueError):
            return default

    def _probe_remote_health(self):
        self._remote_stats['health_checks'] += 1
        try:
            health = self._remote_client.health()
            status = health.get('status', 'unknown')
            self._remote_stats['health_status'] = status
            return health, None
        except Exception as exc:
            self._remote_stats['health_status'] = 'offline'
            return None, exc

    def _wait_for_remote_online(self, timeout_s: float, context: str):
        deadline = time.monotonic() + max(0.0, timeout_s)
        last_problem = None

        while True:
            health, probe_error = self._probe_remote_health()
            if health is not None:
                status = health.get('status', 'unknown')
                if status in ('online', 'online-cpu'):
                    return health
                last_problem = RuntimeError(f"status={status}")
            elif probe_error is not None:
                last_problem = probe_error

            if time.monotonic() >= deadline:
                break

            time.sleep(self.remote_health_poll_s)

        if last_problem is None:
            last_problem = RuntimeError('unknown health failure')

        raise RuntimeError(f"Remote GPU backend unavailable during {context} at {self.remote_url}: {last_problem}") from last_problem

    def _check_remote_health(self, strict: bool, context: str = 'health check'):
        health, probe_error = self._probe_remote_health()
        if health is not None:
            status = health.get('status', 'unknown')
            if status in ('online', 'online-cpu') or not strict:
                return health
            probe_error = RuntimeError(f"Remote GPU backend not online at {self.remote_url} (status={status})")

        self._remote_stats['remote_failures'] += 1
        if strict:
            try:
                return self._wait_for_remote_online(self.remote_init_wait_s, context=context)
            except Exception as recovery_exc:
                raise RuntimeError(f"Remote GPU backend unavailable at {self.remote_url}: {recovery_exc}") from recovery_exc

        return None

    def _execute_remote_call(self, label: str, strict: bool, operation):
        last_exc = None

        for attempt in range(1, self.remote_operation_attempts + 1):
            try:
                return operation()
            except Exception as exc:
                last_exc = exc
                self._remote_stats['remote_failures'] += 1
                if not strict:
                    return None
                if attempt >= self.remote_operation_attempts:
                    break
                try:
                    self._wait_for_remote_online(self.remote_recovery_wait_s, context=f'{label} recovery')
                except Exception as recovery_exc:
                    last_exc = recovery_exc

        raise RuntimeError(f"Remote GPU {label} call failed: {last_exc}") from last_exc

    def _build_qmc_payload(self, history_df):
        close_history = history_df['close'].astype(float).to_numpy()
        returns = np.diff(close_history) / np.maximum(close_history[:-1], 1e-9)
        mu = float(np.mean(returns)) if len(returns) else 0.0
        sigma = float(np.std(returns)) if len(returns) else 0.0
        return {
            'nPaths': int(self.options.get('qmc_paths', 4000)),
            'nSteps': int(self.options.get('qmc_steps', 5)),
            'currentPrice': 1.0,
            'mu': mu * 252,
            'sigma': sigma * np.sqrt(252),
            'dt': 1 / 252,
            'jumpIntensity': 0.03 if sigma > 0.01 else 0.0,
            'jumpMean': 0.0,
            'jumpStd': sigma * 2.5,
        }

    def _remote_qmc_result(self, row, history_df, strict: bool):
        def operation():
            response = self._remote_client.qmc(self._build_qmc_payload(history_df))
            self._remote_stats['remote_qmc_calls'] += 1
            self._remote_stats['remote_qmc_compute_ms'] += self._safe_float(response.get('computeTimeMs'), 0.0)
            final_prices = response.get('finalPrices', [])
            bullish_prob = qmc_prob_positive_from_remote(final_prices, current_price=1.0)
            var_proxy = var_proxy_from_remote(final_prices)
            return {
                'outlook': qmc_bias_from_remote(final_prices, current_price=1.0),
                'var': round(float(row['close']) * var_proxy, 2),
                'bullish_prob': round(float(bullish_prob), 4) if bullish_prob is not None else 0.5,
                'remote_prob_positive': None if bullish_prob is None else round(float(bullish_prob), 4),
                'remote_var_proxy': var_proxy,
            }

        return self._execute_remote_call('QMC', strict, operation)

    def _remote_qaoa_result(self, target_weights, signals, strict: bool):
        def operation():
            payload = {
                'strategyMetrics': build_strategy_metrics(target_weights, signals),
                'maxStrategies': min(self.max_strategies, len(target_weights) or self.max_strategies),
            }
            response = self._remote_client.qaoa(payload)
            self._remote_stats['remote_qaoa_calls'] += 1
            self._remote_stats['remote_qaoa_compute_ms'] += self._safe_float(response.get('computeTimeMs'), 0.0)
            weights = response.get('weights', {}) or target_weights
            return {
                'weights': weights,
                'corr': weight_correlation(target_weights, weights),
            }

        return self._execute_remote_call('QAOA', strict, operation)

    def _remote_vqc_result(self, history_df, strict: bool):
        def operation():
            features = build_features(history_df['close'].astype(float).to_numpy())
            response = self._remote_client.vqc({'features': features})
            self._remote_stats['remote_vqc_calls'] += 1
            self._remote_stats['remote_vqc_compute_ms'] += self._safe_float(response.get('computeTimeMs'), 0.0)
            self._remote_stats['last_remote_regime'] = response.get('regime')
            self._remote_stats['last_remote_regime_confidence'] = response.get('confidence')
            return response

        return self._execute_remote_call('VQC', strict, operation)

    def _apply_remote_qmc_override(self, result, local_outlook, remote_qmc):
        if local_outlook == 'BULLISH':
            self._simulator.qmc_bullish_count = max(0, self._simulator.qmc_bullish_count - 1)
        elif local_outlook == 'BEARISH':
            self._simulator.qmc_bearish_count = max(0, self._simulator.qmc_bearish_count - 1)

        result['qmc_outlook'] = remote_qmc['outlook']
        result['qmc_var'] = remote_qmc['var']
        result['tp_adjust'] = 1.0
        result['quantum_confidence_boost'] = 0.0
        if remote_qmc['outlook'] == 'BULLISH':
            result['tp_adjust'] = config.QMC_BULLISH_TP_BOOST
            result['quantum_confidence_boost'] = 0.05
            self._simulator.qmc_bullish_count += 1
        elif remote_qmc['outlook'] == 'BEARISH':
            result['tp_adjust'] = config.QMC_BEARISH_TP_SHRINK
            result['quantum_confidence_boost'] = -0.05
            self._simulator.qmc_bearish_count += 1

        self._simulator.last_qmc_result = {
            'outlook': remote_qmc['outlook'],
            'var': remote_qmc['var'],
            'bullish_prob': remote_qmc['bullish_prob'],
        }

    def _sample_enabled(self, key: str):
        if self.verify_sample_rate <= 0:
            return False
        self._sample_events[key] += 1
        if self.verify_sample_rate >= 1.0:
            return True
        sample_every = max(1, int(round(1.0 / self.verify_sample_rate)))
        return self._sample_events[key] % sample_every == 0

    def _merge_stats(self):
        stats = dict(self._simulator.get_stats())
        stats['backend'] = self.backend_name
        stats.update(self._remote_stats)
        if stats['verify_qmc_samples'] > 0:
            stats['verify_qmc_match_rate'] = round(stats['verify_qmc_matches'] / stats['verify_qmc_samples'], 4)
        if stats['verify_regime_samples'] > 0:
            stats['verify_regime_match_rate'] = round(stats['verify_regime_matches'] / stats['verify_regime_samples'], 4)
        if stats['verify_qaoa_samples'] > 0:
            stats['verify_avg_qaoa_corr'] = round(stats['verify_qaoa_corr_sum'] / stats['verify_qaoa_samples'], 4)
        return stats


class RemoteGpuQuantumBackend(QuantumBackend, _RemoteQuantumMixin):
    def __init__(self, options: dict | None = None):
        super().__init__('remote-gpu', options=options)
        self._simulator = QuantumPipelineSimulator()
        self._init_remote_support()
        self._check_remote_health(strict=True, context='remote-gpu backend init')

    def process_cycle(self, row, history_df, regime, signals, portfolio_value):
        result = self._simulator.process_cycle(row, history_df, regime, signals, portfolio_value)
        cycle_count = self._simulator.cycle_count

        if cycle_count % config.QMC_SIM_INTERVAL == 0:
            local_outlook = result['qmc_outlook']
            remote_qmc = self._remote_qmc_result(row, history_df, strict=True)
            self._apply_remote_qmc_override(result, local_outlook, remote_qmc)
            self._remote_vqc_result(history_df, strict=False)

        if cycle_count % config.QAOA_WEIGHT_INTERVAL == 0 and result.get('qaoa_weights'):
            remote_qaoa = self._remote_qaoa_result(result['qaoa_weights'], signals, strict=True)
            result['qaoa_weights'] = remote_qaoa['weights']
            self._simulator.last_qaoa_weights = remote_qaoa['weights']

        return result

    def verify_decision(self, consensus, confidence, regime, qra_score):
        return self._simulator.verify_decision(consensus, confidence, regime, qra_score)

    def get_stats(self):
        return self._merge_stats()


class HybridVerifyQuantumBackend(QuantumBackend, _RemoteQuantumMixin):
    def __init__(self, options: dict | None = None):
        super().__init__('hybrid-verify', options=options)
        self._simulator = QuantumPipelineSimulator()
        self._init_remote_support()
        self._check_remote_health(strict=False, context='hybrid-verify backend init')

    def process_cycle(self, row, history_df, regime, signals, portfolio_value):
        result = self._simulator.process_cycle(row, history_df, regime, signals, portfolio_value)
        cycle_count = self._simulator.cycle_count

        if cycle_count % config.QMC_SIM_INTERVAL == 0 and self._sample_enabled('qmc'):
            remote_qmc = self._remote_qmc_result(row, history_df, strict=False)
            if remote_qmc is not None:
                self._remote_stats['verify_qmc_samples'] += 1
                if result.get('qmc_outlook') == remote_qmc['outlook']:
                    self._remote_stats['verify_qmc_matches'] += 1

            remote_vqc = self._remote_vqc_result(history_df, strict=False)
            if remote_vqc is not None:
                self._remote_stats['verify_regime_samples'] += 1
                if remote_vqc.get('regime') == regime:
                    self._remote_stats['verify_regime_matches'] += 1

        if cycle_count % config.QAOA_WEIGHT_INTERVAL == 0 and result.get('qaoa_weights') and self._sample_enabled('qaoa'):
            remote_qaoa = self._remote_qaoa_result(result['qaoa_weights'], signals, strict=False)
            if remote_qaoa is not None and remote_qaoa.get('corr') is not None:
                self._remote_stats['verify_qaoa_samples'] += 1
                self._remote_stats['verify_qaoa_corr_sum'] += float(remote_qaoa['corr'])

        return result

    def verify_decision(self, consensus, confidence, regime, qra_score):
        return self._simulator.verify_decision(consensus, confidence, regime, qra_score)

    def get_stats(self):
        return self._merge_stats()


def create_quantum_backend(backend_name: str = 'simulated', options: dict | None = None) -> QuantumBackend:
    if backend_name == 'simulated':
        return SimulatedQuantumBackend(options=options)

    if backend_name == 'remote-gpu':
        return RemoteGpuQuantumBackend(options=options)

    if backend_name == 'hybrid-verify':
        return HybridVerifyQuantumBackend(options=options)

    raise ValueError(
        f"Unsupported quantum backend '{backend_name}'. "
        f"Supported values: {', '.join(SUPPORTED_QUANTUM_BACKENDS)}"
    )
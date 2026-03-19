"""
QuantumGPU Fidelity Replay

Keeps the main backtest fast by preserving `quantum_sim.py` as the default
simulator, while providing a separate replay harness that compares simulator
outputs with the live Remote GPU contract used by HybridQuantumClassicalPipeline.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

from . import config
from .quantum_sim import QuantumPipelineSimulator


@dataclass
class ReplaySample:
    index: int
    timestamp: str
    simulator_outlook: str
    simulator_regime: str
    simulator_var: float
    remote_qmc_bias: str
    remote_qmc_prob_positive: Optional[float]
    remote_var_proxy: float
    simulator_risk: int
    remote_regime: Optional[str]
    remote_regime_confidence: Optional[float]
    qaoa_weight_corr: Optional[float]


STRATEGY_STYLE_MAP = {
    'AdvancedAdaptive': 'adaptive',
    'RSITurbo': 'mean_reversion',
    'SuperTrend': 'trend',
    'MACrossover': 'trend',
    'MomentumPro': 'trend',
    'NeuralAI': 'adaptive',
    'PythonML': 'adaptive',
    'BollingerMR': 'mean_reversion',
}


class RemoteGPUReplayClient:
    def __init__(self, remote_url: str, timeout_s: float = 5.0):
        self.remote_url = remote_url.rstrip('/')
        self.timeout_s = timeout_s
        self.retry_attempts = max(1, int(os.environ.get('QUANTUM_GPU_RETRY_ATTEMPTS', '2')))
        self.retry_backoff_s = max(0.25, float(os.environ.get('QUANTUM_GPU_RETRY_BACKOFF_S', '1.0')))
        # P#192: HTTP keep-alive connection pooling
        self._conn = None
        self._conn_host = None
        self._conn_port = None
        parsed = urllib.parse.urlparse(remote_url)
        self._parsed_host = parsed.hostname or '127.0.0.1'
        self._parsed_port = parsed.port or 4001

    def _get_conn(self):
        """Get or create a keep-alive HTTP connection."""
        import http.client
        if (self._conn is None or
            self._conn_host != self._parsed_host or
            self._conn_port != self._parsed_port):
            if self._conn:
                try:
                    self._conn.close()
                except Exception:
                    pass
            self._conn = http.client.HTTPConnection(
                self._parsed_host, self._parsed_port,
                timeout=self.timeout_s)
            self._conn_host = self._parsed_host
            self._conn_port = self._parsed_port
        return self._conn

    def _reset_conn(self):
        if self._conn:
            try:
                self._conn.close()
            except Exception:
                pass
            self._conn = None

    @staticmethod
    def _build_no_proxy_opener():
        return urllib.request.build_opener(urllib.request.ProxyHandler({}))

    def _request(self, path: str, payload: Optional[dict] = None) -> dict:
        data = json.dumps(payload).encode('utf-8') if payload is not None else None
        method = 'POST' if data is not None else 'GET'
        headers = {'Content-Type': 'application/json'} if data else {}
        last_exc = None

        for attempt in range(1, self.retry_attempts + 1):
            try:
                conn = self._get_conn()
                conn.request(method, path, body=data, headers=headers)
                resp = conn.getresponse()
                body_bytes = resp.read()
                if resp.status >= 400:
                    raise urllib.error.HTTPError(
                        self.remote_url + path, resp.status, resp.reason,
                        dict(resp.getheaders()), None)
                return json.loads(body_bytes.decode('utf-8'))
            except urllib.error.HTTPError:
                self._reset_conn()
                raise
            except (TimeoutError, ConnectionError, OSError, Exception) as exc:
                last_exc = exc
                self._reset_conn()
                if attempt >= self.retry_attempts:
                    raise
                time.sleep(self.retry_backoff_s * attempt)

        raise last_exc

    def _probe(self, path: str, timeout_s: float = 3.0) -> dict:
        """Single-attempt GET with custom timeout — for health/liveness checks."""
        url = self.remote_url + path
        req = urllib.request.Request(url, method='GET')
        with self._build_no_proxy_opener().open(req, timeout=timeout_s) as resp:
            return json.loads(resp.read().decode('utf-8'))

    def health(self) -> dict:
        return self._request('/health')

    def health_fast(self, timeout_s: float = 3.0) -> dict:
        return self._probe('/health', timeout_s=timeout_s)

    def ping(self) -> dict:
        return self._request('/ping')

    def ping_fast(self, timeout_s: float = 3.0) -> dict:
        return self._probe('/ping', timeout_s=timeout_s)

    def qmc(self, payload: dict) -> dict:
        return self._request('/gpu/qmc', payload)

    def qaoa(self, payload: dict) -> dict:
        return self._request('/gpu/qaoa-weights', payload)

    def vqc(self, payload: dict) -> dict:
        return self._request('/gpu/vqc-regime', payload)

    def batch_quantum(self, ops: list) -> list:
        """P#192: Send multiple QMC/VQC/QAOA ops in one HTTP call."""
        result = self._request('/gpu/batch-quantum', {'ops': ops})
        return result.get('results', [])


def load_csv(csv_path: str) -> pd.DataFrame:
    if not os.path.exists(csv_path):
        raise FileNotFoundError(csv_path)

    df = pd.read_csv(csv_path)
    if 'datetime' in df.columns:
        df['datetime'] = pd.to_datetime(df['datetime'])
    elif 'timestamp' in df.columns:
        df['datetime'] = pd.to_datetime(df['timestamp'])
    else:
        df['datetime'] = pd.RangeIndex(start=0, stop=len(df), step=1)

    for col in ('open', 'high', 'low', 'close', 'volume'):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    return df.dropna(subset=['close']).reset_index(drop=True)


def infer_regime(close_history: np.ndarray) -> str:
    returns = np.diff(close_history) / np.maximum(close_history[:-1], 1e-9)
    if len(returns) == 0:
        return 'RANGING'

    mu = float(np.mean(returns[-20:]))
    sigma = float(np.std(returns[-20:]))
    if sigma > 0.018:
        return 'HIGH_VOLATILITY'
    if mu > 0.0015:
        return 'TRENDING_UP'
    if mu < -0.0015:
        return 'TRENDING_DOWN'
    return 'RANGING'


def build_features(close_history: np.ndarray) -> List[float]:
    if len(close_history) < 2:
        return [0.0] * 8

    prices = close_history[-30:]
    returns = np.diff(prices) / np.maximum(prices[:-1], 1e-9)
    recent = returns[-30:] if len(returns) >= 30 else returns

    mu = float(np.mean(recent)) if len(recent) else 0.0
    sigma = float(np.std(recent)) if len(recent) else 0.0
    latest = float(recent[-1]) if len(recent) else 0.0
    z_score = (latest - mu) / (sigma + 1e-8)
    up_ratio = float(np.mean(recent > 0)) if len(recent) else 0.5
    max_abs = float(np.max(np.abs(recent))) if len(recent) else 0.0
    momentum5 = float(np.mean(recent[-5:])) if len(recent) >= 5 else latest

    # Mirrors the active HybridQuantumClassicalPipeline remote VQC feature contract.
    raw = [mu * 100, sigma * 100, latest * 100, z_score, up_ratio, max_abs * 100, momentum5 * 100, 0.0]
    return [max(-1.0, min(1.0, value)) for value in raw]


def build_strategy_metrics(target_weights: Dict[str, float], signals: Dict[str, dict]) -> Dict[str, dict]:
    if not target_weights:
        return {
            strategy_name: {'returns': 0.0, 'risk': 0.05, 'sharpe': 0.0}
            for strategy_name in config.STATIC_WEIGHTS.keys()
        }

    weights = [float(target_weights.get(name, 0.0)) for name in config.STATIC_WEIGHTS.keys()]
    avg_weight = float(np.mean(weights)) if weights else 0.0

    metrics: Dict[str, dict] = {}
    for strategy_name in config.STATIC_WEIGHTS.keys():
        target_weight = float(target_weights.get(strategy_name, config.STATIC_WEIGHTS.get(strategy_name, 0.0)))
        signal = signals.get(strategy_name, {'action': 'HOLD', 'confidence': 0.5})
        action = signal.get('action', 'HOLD')
        confidence = float(signal.get('confidence', 0.5))
        style = STRATEGY_STYLE_MAP.get(strategy_name, 'adaptive')
        relative_score = (target_weight - avg_weight) / max(avg_weight, 1e-6)
        confidence_bonus = (confidence - 0.5) * 0.20
        hold_penalty = 0.03 if action == 'HOLD' else 0.0

        if style == 'trend':
            style_bonus = 0.05
        elif style == 'mean_reversion':
            style_bonus = 0.03
        else:
            style_bonus = 0.04

        returns_proxy = relative_score + confidence_bonus + style_bonus - hold_penalty
        risk_proxy = max(0.02, 0.12 - target_weight)
        sharpe_proxy = (relative_score * 1.8) + confidence_bonus

        metrics[strategy_name] = {
            'returns': round(float(returns_proxy), 6),
            'risk': round(float(risk_proxy), 6),
            'sharpe': round(float(sharpe_proxy), 6),
        }

    return metrics


def build_signal_map(regime: str) -> Dict[str, dict]:
    trend_action = 'BUY' if regime == 'TRENDING_UP' else 'SELL' if regime == 'TRENDING_DOWN' else 'HOLD'
    return {
        'AdvancedAdaptive': {'action': trend_action if regime != 'HIGH_VOLATILITY' else 'HOLD', 'confidence': 0.61},
        'RSITurbo': {'action': 'BUY' if regime == 'RANGING' else 'HOLD', 'confidence': 0.48 if regime == 'RANGING' else 0.34},
        'SuperTrend': {'action': trend_action, 'confidence': 0.62},
        'MACrossover': {'action': trend_action, 'confidence': 0.58},
        'MomentumPro': {'action': trend_action, 'confidence': 0.56},
        'NeuralAI': {'action': trend_action if regime != 'HIGH_VOLATILITY' else 'HOLD', 'confidence': 0.57},
        'PythonML': {'action': trend_action if regime != 'HIGH_VOLATILITY' else 'HOLD', 'confidence': 0.53},
        'BollingerMR': {'action': 'BUY' if regime == 'RANGING' else 'HOLD', 'confidence': 0.55 if regime == 'RANGING' else 0.33},
    }


def qmc_prob_positive_from_remote(final_prices: List[float], current_price: float = 1.0) -> Optional[float]:
    if not final_prices:
        return None

    positive_paths = sum(1 for price in final_prices if float(price) > current_price)
    return positive_paths / len(final_prices)


def qmc_bias_from_remote(final_prices: List[float], current_price: float = 1.0) -> str:
    # Match HybridQuantumClassicalPipeline._generateRecommendation():
    # >60% positive paths => bullish, <40% => bearish, else neutral.
    prob_positive = qmc_prob_positive_from_remote(final_prices, current_price=current_price)
    if prob_positive is None:
        return 'NEUTRAL'
    if prob_positive > 0.60:
        return 'BULLISH'
    if prob_positive < 0.40:
        return 'BEARISH'
    return 'NEUTRAL'


def var_proxy_from_remote(final_prices: List[float]) -> float:
    if not final_prices:
        return 0.0
    sorted_prices = sorted(final_prices)
    idx = max(0, int(len(sorted_prices) * 0.05) - 1)
    return round(1.0 - float(sorted_prices[idx]), 6)


def weight_correlation(sim_weights: Dict[str, float], remote_weights: Dict[str, float]) -> Optional[float]:
    keys = sorted(set(sim_weights.keys()) & set(remote_weights.keys()))
    if len(keys) < 2:
        return None
    left = np.array([sim_weights[key] for key in keys], dtype=float)
    right = np.array([remote_weights[key] for key in keys], dtype=float)
    if np.std(left) < 1e-9 or np.std(right) < 1e-9:
        return None
    return float(np.corrcoef(left, right)[0, 1])


def replay(csv_path: str, remote_url: str, samples: int, output_path: Optional[str]) -> dict:
    df = load_csv(csv_path)
    if len(df) < 80:
        raise ValueError('Need at least 80 candles for fidelity replay')

    client = RemoteGPUReplayClient(remote_url)
    health = client.health()
    simulator = QuantumPipelineSimulator()

    start_idx = 60
    end_idx = len(df) - 2
    sample_indices = np.linspace(start_idx, end_idx, num=min(samples, end_idx - start_idx + 1), dtype=int)

    replay_rows: List[ReplaySample] = []
    qmc_matches = 0
    regime_matches = 0
    qaoa_corrs: List[float] = []

    for idx in sample_indices:
        history = df.iloc[max(0, idx - 60):idx + 1].copy()
        row = history.iloc[-1]
        close_history = history['close'].astype(float).to_numpy()
        regime = infer_regime(close_history)
        signals = build_signal_map(regime)

        sim_qmc = simulator._simulate_qmc(row, history, regime)
        sim_qra = simulator._simulate_qra(row, history, regime)
        sim_qaoa = simulator._simulate_qaoa(signals, regime)

        returns = np.diff(close_history) / np.maximum(close_history[:-1], 1e-9)
        mu = float(np.mean(returns)) if len(returns) else 0.0
        sigma = float(np.std(returns)) if len(returns) else 0.0

        remote_qmc = client.qmc({
            'nPaths': 4000,
            'nSteps': 5,
            'currentPrice': 1.0,
            'mu': mu * 252,
            'sigma': sigma * math.sqrt(252),
            'dt': 1 / 252,
            'jumpIntensity': 0.03 if sigma > 0.01 else 0.0,
            'jumpMean': 0.0,
            'jumpStd': sigma * 2.5,
        })
        remote_final_prices = remote_qmc.get('finalPrices', [])
        remote_qmc_prob_positive = qmc_prob_positive_from_remote(remote_final_prices, current_price=1.0)
        remote_qmc_bias = qmc_bias_from_remote(remote_final_prices, current_price=1.0)
        remote_var = var_proxy_from_remote(remote_final_prices)
        if sim_qmc['outlook'] == remote_qmc_bias:
            qmc_matches += 1

        remote_vqc = client.vqc({'features': build_features(close_history)})
        remote_regime = remote_vqc.get('regime')
        if remote_regime == regime:
            regime_matches += 1

        remote_qaoa = client.qaoa({'strategyMetrics': build_strategy_metrics(sim_qaoa, signals), 'maxStrategies': 5})
        corr = weight_correlation(sim_qaoa, remote_qaoa.get('weights', {}))
        if corr is not None:
            qaoa_corrs.append(corr)

        replay_rows.append(ReplaySample(
            index=int(idx),
            timestamp=str(row['datetime']),
            simulator_outlook=sim_qmc['outlook'],
            simulator_regime=regime,
            simulator_var=float(sim_qmc['var']),
            remote_qmc_bias=remote_qmc_bias,
            remote_qmc_prob_positive=None if remote_qmc_prob_positive is None else round(float(remote_qmc_prob_positive), 4),
            remote_var_proxy=remote_var,
            simulator_risk=int(sim_qra),
            remote_regime=remote_regime,
            remote_regime_confidence=remote_vqc.get('confidence'),
            qaoa_weight_corr=corr,
        ))

    report = {
        'contract': 'HybridQuantumClassicalPipeline remote GPU fidelity replay',
        'csv': csv_path,
        'remote_url': remote_url,
        'health': health,
        'samples': [row.__dict__ for row in replay_rows],
        'summary': {
            'sample_count': len(replay_rows),
            'qmc_direction_match_rate': round(qmc_matches / max(len(replay_rows), 1), 4),
            'regime_match_rate': round(regime_matches / max(len(replay_rows), 1), 4),
            'avg_qaoa_weight_corr': round(float(np.mean(qaoa_corrs)), 4) if qaoa_corrs else None,
            'avg_remote_var_proxy': round(float(np.mean([row.remote_var_proxy for row in replay_rows])), 6) if replay_rows else 0.0,
        },
    }

    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as handle:
            json.dump(report, handle, indent=2)

    return report


def main() -> int:
    parser = argparse.ArgumentParser(description='QuantumGPU fidelity replay against remote HybridQuantumClassicalPipeline contract')
    parser.add_argument('--csv', required=True, help='Path to OHLCV CSV file')
    parser.add_argument('--remote-url', required=True, help='Remote GPU service base URL, e.g. http://127.0.0.1:4000')
    parser.add_argument('--samples', type=int, default=12, help='Number of replay windows to compare')
    parser.add_argument('--output', default=None, help='Optional JSON output path')
    args = parser.parse_args()

    try:
        report = replay(args.csv, args.remote_url, args.samples, args.output)
    except urllib.error.URLError as exc:
        print(f'ERROR: remote GPU service unavailable: {exc}')
        return 2
    except Exception as exc:
        print(f'ERROR: {exc}')
        return 1

    summary = report['summary']
    print('=== QuantumGPU Fidelity Replay ===')
    print(f"Samples: {summary['sample_count']}")
    print(f"QMC direction match: {summary['qmc_direction_match_rate'] * 100:.1f}%")
    print(f"Regime match: {summary['regime_match_rate'] * 100:.1f}%")
    print(f"Avg QAOA weight corr: {summary['avg_qaoa_weight_corr']}")
    if args.output:
        print(f"Report saved to {args.output}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
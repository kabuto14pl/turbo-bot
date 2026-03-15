"""Process-isolated remote-GPU full-pipeline backtest orchestrator.

This runner exists because the canonical backtest stack mutates module-level
config during execution. Full backtests must therefore be isolated in separate
processes if we want safe concurrency.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
RESULTS_DIR = ROOT_DIR / 'ml-service' / 'results'
DEFAULT_REMOTE_URL = os.environ.get('QUANTUM_GPU_REMOTE_URL') or os.environ.get('GPU_REMOTE_URL') or 'http://127.0.0.1:4000'
DEFAULT_JOB_SPECS = [
    'single:15m',
    'single:1h',
    'single:4h',
    'multi:15m',
    'walkforward:15m',
]


def check_remote_health(remote_url: str, timeout_s: float) -> dict:
    request = urllib.request.Request(f'{remote_url.rstrip("/")}/health')
    with urllib.request.urlopen(request, timeout=timeout_s) as response:
        return json.loads(response.read().decode('utf-8'))


def wait_remote_health(remote_url: str, timeout_s: float, poll_s: float = 2.0) -> dict | None:
    deadline = time.time() + max(0.0, timeout_s)

    while True:
        try:
            health = check_remote_health(remote_url, timeout_s=min(max(poll_s, 1.0), 5.0))
            status = str(health.get('status', 'unknown'))
            if status in ('online', 'online-cpu'):
                return health
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            pass

        if time.time() >= deadline:
            return None

        time.sleep(max(0.25, poll_s))


def parse_job_spec(spec: str) -> dict:
    parts = spec.split(':')
    mode = parts[0].strip().lower()
    timeframe = parts[1].strip() if len(parts) > 1 and parts[1].strip() else None

    if mode not in ('single', 'multi', 'walkforward', 'all'):
        raise ValueError(f'Unsupported job spec: {spec}')

    if mode != 'all' and not timeframe:
        raise ValueError(f'Job spec requires timeframe: {spec}')

    name = f'{mode}_{timeframe or "all"}'
    return {
        'spec': spec,
        'mode': mode,
        'timeframe': timeframe,
        'name': name,
    }


def build_worker_command(args, job: dict, output_path: Path) -> list[str]:
    command = [
        sys.executable,
        str(Path(__file__).resolve()),
        '--worker',
        '--job-spec',
        job['spec'],
        '--remote-url',
        args.remote_url,
        '--gpu-timeout-s',
        str(args.gpu_timeout_s),
        '--job-start-health-timeout-s',
        str(args.job_start_health_timeout_s),
        '--output',
        str(output_path),
    ]

    if args.trades:
        command.append('--trades')

    return command


def _single_summary(result: dict, timeframe: str) -> dict:
    q_summary = result.get('quantum_summary', {})
    return {
        'mode': 'single',
        'timeframe': timeframe,
        'backend': q_summary.get('backend', result.get('quantum_backend', 'unknown')),
        'remote_status': q_summary.get('remote_status', 'unknown'),
        'remote_failures': int(q_summary.get('remote_failures', 0) or 0),
        'net_profit': float(result.get('net_profit', 0.0) or 0.0),
        'total_return_pct': float(result.get('total_return_pct', 0.0) or 0.0),
        'profit_factor': float(result.get('profit_factor', 0.0) or 0.0),
        'sharpe_ratio': float(result.get('sharpe_ratio', 0.0) or 0.0),
        'max_drawdown': float(result.get('max_drawdown', 0.0) or 0.0),
        'total_trades': int(result.get('total_trades', 0) or 0),
    }


def _multi_summary(results: dict, timeframe: str) -> dict:
    total_pairs = 0
    positive_pairs = 0
    total_net_profit = 0.0
    remote_failures = 0
    remote_statuses = []

    for symbol, result in (results or {}).items():
        if result.get('error'):
            continue
        total_pairs += 1
        pair_pnl = float(result.get('net_profit', 0.0) or 0.0) + float(result.get('funding_arb_pnl', 0.0) or 0.0)
        total_net_profit += pair_pnl
        if pair_pnl > 0:
            positive_pairs += 1
        q_summary = result.get('quantum_summary', {})
        remote_failures += int(q_summary.get('remote_failures', 0) or 0)
        remote_statuses.append(str(q_summary.get('remote_status', 'unknown')))

    remote_status = 'unknown'
    if remote_statuses:
        remote_status = 'online' if all(status == 'online' for status in remote_statuses) else 'mixed'

    return {
        'mode': 'multi',
        'timeframe': timeframe,
        'backend': 'remote-gpu',
        'remote_status': remote_status,
        'remote_failures': remote_failures,
        'total_pairs': total_pairs,
        'positive_pairs': positive_pairs,
        'total_net_profit': round(total_net_profit, 2),
    }


def _walkforward_summary(train_results: dict, test_results: dict, timeframe: str) -> dict:
    total_pairs = 0
    positive_test_pairs = 0
    total_test_net_profit = 0.0
    remote_failures = 0
    remote_statuses = []

    for symbol, result in (test_results or {}).items():
        if result.get('error'):
            continue
        total_pairs += 1
        pair_pnl = float(result.get('net_profit', 0.0) or 0.0) + float(result.get('funding_arb_pnl', 0.0) or 0.0)
        total_test_net_profit += pair_pnl
        if pair_pnl > 0:
            positive_test_pairs += 1
        q_summary = result.get('quantum_summary', {})
        remote_failures += int(q_summary.get('remote_failures', 0) or 0)
        remote_statuses.append(str(q_summary.get('remote_status', 'unknown')))

    remote_status = 'unknown'
    if remote_statuses:
        remote_status = 'online' if all(status == 'online' for status in remote_statuses) else 'mixed'

    return {
        'mode': 'walkforward',
        'timeframe': timeframe,
        'backend': 'remote-gpu',
        'remote_status': remote_status,
        'remote_failures': remote_failures,
        'total_pairs': total_pairs,
        'positive_test_pairs': positive_test_pairs,
        'total_test_net_profit': round(total_test_net_profit, 2),
        'train_pairs': len(train_results or {}),
        'test_pairs': len(test_results or {}),
    }


def worker(job: dict, output_path: Path, show_trades: bool) -> int:
    sys.path.insert(0, str(ROOT_DIR / 'ml-service'))
    from backtest_pipeline.runner import run_all_timeframes, run_multi_pair, run_single, run_walk_forward

    quantum_backend_options = {
        'remote_url': args_for_worker.remote_url,
        'timeout_s': args_for_worker.gpu_timeout_s,
        'verify_sample_rate': 0.0,
        'init_wait_s': args_for_worker.job_start_health_timeout_s,
        'recovery_wait_s': args_for_worker.job_start_health_timeout_s,
        'health_poll_s': 2.0,
        'operation_attempts': 2,
    }

    payload = {
        'job': job,
        'started_at': datetime.now(UTC).isoformat().replace('+00:00', 'Z'),
        'remote_url': args_for_worker.remote_url,
    }

    if job['mode'] == 'single':
        result = run_single(
            timeframe=job['timeframe'],
            verbose=True,
            show_trades=show_trades,
            quantum_backend='remote-gpu',
            quantum_backend_options=quantum_backend_options,
        )
        payload['result'] = result
        payload['summary'] = _single_summary(result, job['timeframe'])
    elif job['mode'] == 'multi':
        result = run_multi_pair(
            timeframe=job['timeframe'],
            verbose=True,
            show_trades=show_trades,
            use_pair_config=True,
            quantum_backend='remote-gpu',
            quantum_backend_options=quantum_backend_options,
        )
        payload['result'] = result
        payload['summary'] = _multi_summary(result, job['timeframe'])
    elif job['mode'] == 'walkforward':
        train_results, test_results = run_walk_forward(
            timeframe=job['timeframe'],
            train_pct=0.70,
            use_pair_config=True,
            quantum_backend='remote-gpu',
            quantum_backend_options=quantum_backend_options,
        )
        payload['result'] = {
            'train': train_results,
            'test': test_results,
        }
        payload['summary'] = _walkforward_summary(train_results, test_results, job['timeframe'])
    else:
        result = run_all_timeframes(
            quantum_backend='remote-gpu',
            quantum_backend_options=quantum_backend_options,
        )
        payload['result'] = result
        payload['summary'] = {
            'mode': 'all',
            'backend': 'remote-gpu',
            'timeframes': sorted(result.keys()),
        }

    payload['finished_at'] = datetime.now(UTC).isoformat().replace('+00:00', 'Z')
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2, default=str), encoding='utf-8')
    print(f'\n[WORKER] Saved job artifact: {output_path}')
    return 0


def run_job(args, job: dict, run_dir: Path) -> dict:
    artifact_path = run_dir / f'{job["name"]}.json'
    log_path = run_dir / f'{job["name"]}.log'
    command = build_worker_command(args, job, artifact_path)
    preflight_lines = []

    started_at = time.time()
    if args.job_start_health_timeout_s > 0 and not args.skip_health_check:
        preflight_lines.append(
            f"[PRECHECK] Waiting for remote health before {job['spec']} (timeout={args.job_start_health_timeout_s:.1f}s)"
        )
        health = wait_remote_health(args.remote_url, timeout_s=args.job_start_health_timeout_s)
        if health is None:
            preflight_lines.append(
                f"[ERROR] Remote GPU did not return online before starting {job['spec']}"
            )
            log_path.write_text('\n'.join(preflight_lines) + '\n', encoding='utf-8')
            return {
                'job': job,
                'artifact_path': str(artifact_path),
                'log_path': str(log_path),
                'exit_code': 1,
                'elapsed_s': round(time.time() - started_at, 2),
                'artifact': None,
            }

        preflight_lines.append(
            f"[PRECHECK] Remote GPU online: status={health.get('status', 'unknown')}"
        )

    # Force UTF-8 encoding for worker processes to handle emoji in runner output on Windows
    worker_env = {**os.environ, 'PYTHONIOENCODING': 'utf-8'}
    with open(log_path, 'w', encoding='utf-8') as log_handle:
        if preflight_lines:
            log_handle.write('\n'.join(preflight_lines) + '\n\n')
        process = subprocess.run(
            command,
            cwd=str(ROOT_DIR),
            stdout=log_handle,
            stderr=subprocess.STDOUT,
            text=True,
            check=False,
            env=worker_env,
        )

    elapsed_s = round(time.time() - started_at, 2)
    result = {
        'job': job,
        'artifact_path': str(artifact_path),
        'log_path': str(log_path),
        'exit_code': process.returncode,
        'elapsed_s': elapsed_s,
    }

    if artifact_path.exists():
        result['artifact'] = json.loads(artifact_path.read_text(encoding='utf-8'))
    else:
        result['artifact'] = None

    return result


def aggregate_results(run_dir: Path, job_results: list[dict], args) -> Path:
    aggregate = {
        'created_at': datetime.now(UTC).isoformat().replace('+00:00', 'Z'),
        'remote_url': args.remote_url,
        'mode': 'full_pipeline_remote_gpu',
        'max_parallel': args.max_parallel,
        'jobs': [],
    }

    for job_result in job_results:
        artifact = job_result.get('artifact') or {}
        aggregate['jobs'].append({
            'job': job_result['job'],
            'exit_code': job_result['exit_code'],
            'elapsed_s': job_result['elapsed_s'],
            'artifact_path': job_result['artifact_path'],
            'log_path': job_result['log_path'],
            'summary': artifact.get('summary'),
        })

    summary_path = run_dir / 'aggregate_manifest.json'
    summary_path.write_text(json.dumps(aggregate, indent=2), encoding='utf-8')
    return summary_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Process-isolated remote-gpu full-pipeline backtest orchestrator')
    parser.add_argument('--jobs', nargs='*', default=DEFAULT_JOB_SPECS,
                        help='Job specs: single:15m multi:15m walkforward:15m single:1h single:4h')
    parser.add_argument('--max-parallel', type=int, default=2,
                        help='Maximum concurrent worker processes. Keep low for remote-gpu.')
    parser.add_argument('--remote-url', default=DEFAULT_REMOTE_URL,
                        help='Remote QuantumGPU base URL')
    parser.add_argument('--gpu-timeout-s', type=float, default=15.0,
                        help='Remote QuantumGPU timeout per request')
    parser.add_argument('--job-start-health-timeout-s', type=float, default=90.0,
                        help='How long to wait for /health to recover before starting each worker job')
    parser.add_argument('--skip-health-check', action='store_true',
                        help='Skip strict /health check before dispatching jobs')
    parser.add_argument('--trades', action='store_true',
                        help='Enable trade table / CSV export inside worker jobs')
    parser.add_argument('--results-dir', default=str(RESULTS_DIR),
                        help='Directory for per-run orchestrator artifacts')
    parser.add_argument('--worker', action='store_true', help=argparse.SUPPRESS)
    parser.add_argument('--job-spec', default=None, help=argparse.SUPPRESS)
    parser.add_argument('--output', default=None, help=argparse.SUPPRESS)
    return parser.parse_args()


def print_job_line(job_result: dict):
    job = job_result['job']
    artifact = job_result.get('artifact') or {}
    summary = artifact.get('summary') or {}
    status = 'OK' if job_result['exit_code'] == 0 else 'FAIL'
    backend = summary.get('backend', 'n/a')
    remote_status = str(summary.get('remote_status', 'n/a')).upper()
    print(f"[{status}] {job['spec']:<18} backend={backend:<10} remote={remote_status:<7} time={job_result['elapsed_s']:>7.2f}s")


args_for_worker: argparse.Namespace | None = None


def main() -> int:
    global args_for_worker
    args = parse_args()

    if args.worker:
        if not args.job_spec or not args.output:
            raise SystemExit('--worker requires --job-spec and --output')
        args_for_worker = args
        return worker(parse_job_spec(args.job_spec), Path(args.output), show_trades=args.trades)

    if not args.skip_health_check:
        try:
            health = check_remote_health(args.remote_url, timeout_s=min(args.gpu_timeout_s, 5.0))
        except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
            raise SystemExit(f'Remote GPU health check failed for {args.remote_url}: {exc}') from exc

        status = str(health.get('status', 'unknown'))
        gpu_active = health.get('gpu_active', False)
        if status == 'online-cpu':
            print(f'\n⚠️  WARNING: GPU service is running on CPU fallback at {args.remote_url}')
            print(f'⚠️  Quantum computations will be SLOW (no CUDA acceleration)')
            print(f'⚠️  Fix: pip install torch --index-url https://download.pytorch.org/whl/cu124\n')
        elif status != 'online':
            raise SystemExit(f'Remote GPU is not online at {args.remote_url} (status={status})')

    run_dir = Path(args.results_dir) / f'remote_gpu_full_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
    run_dir.mkdir(parents=True, exist_ok=True)
    jobs = [parse_job_spec(spec) for spec in args.jobs]

    print('\n=== REMOTE GPU FULL-PIPELINE ORCHESTRATOR ===')
    print(f'Run dir: {run_dir}')
    print(f'Remote URL: {args.remote_url}')
    print(f'Max parallel: {args.max_parallel}')
    print('Jobs: ' + ', '.join(job['spec'] for job in jobs))

    job_results = []
    if max(1, args.max_parallel) == 1:
        for job in jobs:
            job_result = run_job(args, job, run_dir)
            job_results.append(job_result)
            print_job_line(job_result)
    else:
        with ThreadPoolExecutor(max_workers=max(1, args.max_parallel)) as executor:
            future_map = {
                executor.submit(run_job, args, job, run_dir): job
                for job in jobs
            }
            for future in as_completed(future_map):
                job_result = future.result()
                job_results.append(job_result)
                print_job_line(job_result)

    job_results.sort(key=lambda item: item['job']['spec'])
    manifest_path = aggregate_results(run_dir, job_results, args)
    print(f'\nAggregate manifest: {manifest_path}')

    failed = [result for result in job_results if result['exit_code'] != 0]
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
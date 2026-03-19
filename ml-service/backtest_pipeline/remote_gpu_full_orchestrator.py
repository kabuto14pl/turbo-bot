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
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlparse


ROOT_DIR = Path(__file__).resolve().parents[2]
RESULTS_DIR = ROOT_DIR / 'ml-service' / 'results'
DEFAULT_REMOTE_URL = os.environ.get('QUANTUM_GPU_REMOTE_URL') or os.environ.get('GPU_REMOTE_URL') or 'http://127.0.0.1:4001'
DEFAULT_JOB_SPECS = [
    'single:15m',
    'single:1h',
    'single:4h',
    'multi:15m',
    'walkforward:15m',
]


def _build_no_proxy_opener():
    return urllib.request.build_opener(urllib.request.ProxyHandler({}))


def gpu_native_engine_enabled() -> bool:
    try:
        sys.path.insert(0, str(ROOT_DIR / 'ml-service'))
        from backtest_pipeline import config as bt_config
        return bool(getattr(bt_config, 'GPU_NATIVE_ENGINE', False))
    except Exception:
        return False


def check_remote_health(remote_url: str, timeout_s: float) -> dict:
    request = urllib.request.Request(f'{remote_url.rstrip("/")}/health')
    with _build_no_proxy_opener().open(request, timeout=timeout_s) as response:
        return json.loads(response.read().decode('utf-8'))


def check_remote_ping(remote_url: str, timeout_s: float) -> dict:
    request = urllib.request.Request(f'{remote_url.rstrip("/")}/ping')
    with _build_no_proxy_opener().open(request, timeout=timeout_s) as response:
        payload = json.loads(response.read().decode('utf-8'))

    return {
        'status': 'reachable',
        'ping_only': True,
        'service': payload.get('service', 'unknown'),
        'version': payload.get('version', 'unknown'),
        'uptime_s': payload.get('uptime_s'),
    }


def tcp_port_open(host: str, port: int, timeout_s: float = 3.0) -> bool:
    """Raw socket test — bypasses HTTP, proxies, AV inspection."""
    try:
        with socket.create_connection((host, port), timeout=timeout_s) as s:
            return True
    except (OSError, TimeoutError):
        return False


def diagnose_connectivity(remote_url: str) -> dict:
    """Run connectivity diagnostics and return a result dict."""
    parsed = urlparse(remote_url)
    host = parsed.hostname or '127.0.0.1'
    port = parsed.port or 4001

    result = {'host': host, 'port': port, 'tcp_open': False, 'http_ok': False, 'ping_ok': False}

    print(f'  [DIAG] Testing raw TCP connection to {host}:{port} ...', flush=True)
    result['tcp_open'] = tcp_port_open(host, port, timeout_s=3.0)
    print(f'  [DIAG] TCP port {port}: {"OPEN" if result["tcp_open"] else "BLOCKED/CLOSED"}', flush=True)

    if result['tcp_open']:
        print(f'  [DIAG] Testing HTTP /ping ...', flush=True)
        try:
            check_remote_ping(remote_url, timeout_s=5.0)
            result['ping_ok'] = True
            print(f'  [DIAG] HTTP /ping: OK', flush=True)
        except Exception as e:
            print(f'  [DIAG] HTTP /ping: FAILED ({e})', flush=True)

        if result['ping_ok']:
            print(f'  [DIAG] Testing HTTP /health ...', flush=True)
            try:
                check_remote_health(remote_url, timeout_s=10.0)
                result['http_ok'] = True
                print(f'  [DIAG] HTTP /health: OK', flush=True)
            except Exception as e:
                print(f'  [DIAG] HTTP /health: FAILED ({e})', flush=True)

    return result


def check_remote_health_with_retry(remote_url: str, timeout_s: float, retries: int = 2) -> dict:
    """Retry wrapper — short timeouts to fail fast on Windows."""
    fast_timeout = min(timeout_s, 5.0)
    last_exc: Exception = RuntimeError('no attempts')
    for attempt in range(retries):
        if attempt > 0:
            print(f'  [HEALTH] Retry {attempt + 1}/{retries} ...', flush=True)
        try:
            return check_remote_health(remote_url, timeout_s=fast_timeout)
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as exc:
            last_exc = exc
            try:
                return check_remote_ping(remote_url, timeout_s=min(3.0, fast_timeout))
            except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as ping_exc:
                last_exc = ping_exc
            if attempt < retries - 1:
                time.sleep(0.5)
    raise last_exc


def wait_remote_health(remote_url: str, timeout_s: float, poll_s: float = 2.0) -> dict | None:
    """Quick poll — each attempt uses short timeout so we don't burn 90s on one probe."""
    deadline = time.time() + max(0.0, timeout_s)
    fast_timeout = min(3.0, max(1.0, poll_s))

    while True:
        try:
            health = check_remote_health(remote_url, timeout_s=fast_timeout)
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError):
            try:
                health = check_remote_ping(remote_url, timeout_s=min(2.0, fast_timeout))
            except (urllib.error.URLError, TimeoutError, ConnectionError, OSError):
                health = None

        if health is not None:
            status = str(health.get('status', 'unknown'))
            if status in ('online', 'online-cpu', 'reachable'):
                return health

        if time.time() >= deadline:
            return None

        time.sleep(max(0.25, min(poll_s, 1.0)))


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


def _read_log_tail(log_path: Path, max_lines: int = 40) -> str | None:
    if not log_path.exists():
        return None

    try:
        lines = log_path.read_text(encoding='utf-8', errors='replace').splitlines()
    except OSError:
        return None

    if not lines:
        return None

    return '\n'.join(lines[-max_lines:])


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

    print(f"\n[START] {job['spec']}", flush=True)
    print(f"        log: {log_path}", flush=True)
    print(f"   artifact: {artifact_path}", flush=True)

    started_at = time.time()
    health = None
    # Use short precheck: if the main health check already failed, don't waste 90s per job
    precheck_timeout = min(args.job_start_health_timeout_s, 10.0)
    if args.job_start_health_timeout_s > 0 and not args.skip_health_check:
        preflight_lines.append(
            f"[PRECHECK] Waiting for remote health before {job['spec']} (timeout={precheck_timeout:.1f}s)"
        )
        health = wait_remote_health(args.remote_url, timeout_s=precheck_timeout)
        if health is None:
            preflight_lines.append(
                f"[WARN] Remote GPU health probe unreachable before starting {job['spec']}"
            )
            preflight_lines.append(
                '[WARN] Continuing anyway because local Windows loopback can be blocked by proxy/firewall while the service is still alive'
            )
        else:
            preflight_lines.append(
                f"[PRECHECK] Remote GPU online: status={health.get('status', 'unknown')}"
            )
            if health.get('ping_only'):
                preflight_lines.append(
                    '[PRECHECK] /health timed out, but /ping responded — continuing and letting real GPU calls verify the service'
                )

    if preflight_lines:
        print('\n'.join(preflight_lines), flush=True)

    # Force UTF-8 encoding for worker processes to handle emoji in runner output on Windows
    # NO_PROXY ensures urllib bypasses any system proxy for localhost; belt-and-suspenders with ProxyHandler({})
    worker_env = {**os.environ, 'PYTHONIOENCODING': 'utf-8', 'NO_PROXY': '*', 'no_proxy': '*'}
    if health is None:
        worker_env['QUANTUM_REMOTE_PRECHECK'] = 'unreachable'
    print(f"[RUNNING] {job['spec']} worker launched; stdout/stderr -> {log_path}", flush=True)
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

    if process.returncode != 0:
        result['log_tail'] = _read_log_tail(log_path)

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
    parser.add_argument('--gpu-timeout-s', type=float, default=120.0,
                        help='Remote QuantumGPU timeout per request (high default for CUDA JIT warmup)')
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
    print(f"[{status}] {job['spec']:<18} backend={backend:<10} remote={remote_status:<7} time={job_result['elapsed_s']:>7.2f}s", flush=True)
    print(f"       log: {job_result['log_path']}", flush=True)
    if job_result['exit_code'] != 0 and job_result.get('log_tail'):
        print('       last log lines:', flush=True)
        print(job_result['log_tail'], flush=True)


args_for_worker: argparse.Namespace | None = None


def main() -> int:
    global args_for_worker
    args = parse_args()

    print('\n=== REMOTE GPU FULL-PIPELINE ORCHESTRATOR ===', flush=True)
    print(f'Remote URL: {args.remote_url}', flush=True)
    print('Worker output is written to per-job log files while jobs run.', flush=True)
    print('Requested jobs: ' + ', '.join(args.jobs), flush=True)

    if args.max_parallel > 1:
        if gpu_native_engine_enabled():
            print('Remote GPU orchestrator + GPU-native config detected -> forcing max_parallel=1 to avoid worker contention', flush=True)
        else:
            print('Remote GPU orchestrator -> forcing max_parallel=1 to avoid service contention', flush=True)
        args.max_parallel = 1

    if args.worker:
        if not args.job_spec or not args.output:
            raise SystemExit('--worker requires --job-spec and --output')
        args_for_worker = args
        return worker(parse_job_spec(args.job_spec), Path(args.output), show_trades=args.trades)

    if not args.skip_health_check:
        print(f'Checking remote GPU health at {args.remote_url} ...', flush=True)
        try:
            health = check_remote_health_with_retry(args.remote_url, timeout_s=args.gpu_timeout_s, retries=2)
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as exc:
            print(f'\n⚠️  HTTP health check failed: {exc}', flush=True)
            print('  Running connectivity diagnostics ...', flush=True)
            diag = diagnose_connectivity(args.remote_url)

            if not diag['tcp_open']:
                print(
                    f'\n❌ TCP port {diag["port"]} is NOT reachable on {diag["host"]}.'
                    f'\n   The GPU service may not be running, or Windows Firewall is blocking it.'
                    f'\n   Fix options:'
                    f'\n   1. Make sure gpu-cuda-service.py is running in another terminal'
                    f'\n   2. Add firewall rule (admin PowerShell):'
                    f'\n      New-NetFirewallRule -DisplayName "TurboBot GPU" -Direction Inbound -Protocol TCP -LocalPort {diag["port"]} -Action Allow'
                    f'\n   3. Temporarily disable firewall: Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False'
                    f'\n'
                )
                raise SystemExit(1)
            elif not diag['ping_ok']:
                print(
                    f'\n⚠️  TCP port {diag["port"]} is OPEN but HTTP requests fail.'
                    f'\n   Likely cause: antivirus/proxy intercepting HTTP on localhost.'
                    f'\n   Fix: add 127.0.0.1 and localhost to proxy exclusions.'
                    f'\n   Continuing anyway — GPU calls may still work ...\n'
                )
                health = None
            else:
                health = None

        if health is not None:
            status = str(health.get('status', 'unknown'))
            gpu_active = health.get('gpu_active', False)
            backend = health.get('backend', 'unknown')
            ping_only = bool(health.get('ping_only'))

            if status not in ('online', 'reachable'):
                raise SystemExit(f'Remote GPU is not online at {args.remote_url} (status={status})')

            if (not ping_only) and (not gpu_active or backend != 'cuda'):
                raise SystemExit(
                    f'\n❌ BLOCKED: GPU service at {args.remote_url} has NO CUDA active!\n'
                    f'   status={status} gpu_active={gpu_active} backend={backend}\n'
                    f'   Fix: pip install torch --index-url https://download.pytorch.org/whl/cu128\n'
                    f'   Then restart gpu-cuda-service.py\n'
                )

            if ping_only:
                print(
                    '\n⚠️  /health timed out, but /ping responded. Continuing without strict startup CUDA verification.',
                    flush=True,
                )
            else:
                gpu_info = health.get('gpu', {})
                gpu_device = gpu_info.get('device', 'unknown')
                vram = gpu_info.get('vram_total_gb', 0)
                print(f'\n✅ GPU service ONLINE: {gpu_device} | VRAM: {vram} GB | backend: {backend}', flush=True)

    run_dir = Path(args.results_dir) / f'remote_gpu_full_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
    run_dir.mkdir(parents=True, exist_ok=True)
    jobs = [parse_job_spec(spec) for spec in args.jobs]

    print(f'Run dir: {run_dir}', flush=True)
    print(f'Max parallel: {args.max_parallel}', flush=True)
    print('Jobs: ' + ', '.join(job['spec'] for job in jobs), flush=True)

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
    print(f'\nAggregate manifest: {manifest_path}', flush=True)

    failed = [result for result in job_results if result['exit_code'] != 0]
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
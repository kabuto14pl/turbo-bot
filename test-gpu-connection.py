#!/usr/bin/env python3
"""Quick GPU service connectivity diagnostic.

Usage (Windows):
    py -3 test-gpu-connection.py
    py -3 test-gpu-connection.py http://127.0.0.1:4000

Usage (Linux):
    python3 test-gpu-connection.py
"""

import json
import os
import socket
import sys
import time
import urllib.error
import urllib.request
from urllib.parse import urlparse

os.environ.setdefault('NO_PROXY', '*')
os.environ.setdefault('no_proxy', '*')

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4000'
parsed = urlparse(URL)
HOST = parsed.hostname or '127.0.0.1'
PORT = parsed.port or 4000


def opener():
    return urllib.request.build_opener(urllib.request.ProxyHandler({}))


def test_tcp():
    print(f'\n[1/4] TCP socket test -> {HOST}:{PORT}')
    try:
        t0 = time.time()
        with socket.create_connection((HOST, PORT), timeout=5) as s:
            elapsed = time.time() - t0
            print(f'      OK  ({elapsed*1000:.0f}ms)')
            return True
    except Exception as e:
        print(f'      FAIL: {e}')
        return False


def test_ping():
    print(f'\n[2/4] HTTP GET /ping -> {URL}/ping')
    try:
        t0 = time.time()
        req = urllib.request.Request(f'{URL}/ping', method='GET')
        with opener().open(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            elapsed = time.time() - t0
            print(f'      OK  ({elapsed*1000:.0f}ms): {json.dumps(data)}')
            return True
    except Exception as e:
        print(f'      FAIL: {e}')
        return False


def test_health():
    print(f'\n[3/4] HTTP GET /health -> {URL}/health')
    try:
        t0 = time.time()
        req = urllib.request.Request(f'{URL}/health', method='GET')
        with opener().open(req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            elapsed = time.time() - t0
            status = data.get('status', '?')
            gpu = data.get('gpu', {}).get('device', '?')
            backend = data.get('backend', '?')
            print(f'      OK  ({elapsed*1000:.0f}ms): status={status} gpu={gpu} backend={backend}')
            return True
    except Exception as e:
        print(f'      FAIL: {e}')
        return False


def test_qmc():
    print(f'\n[4/4] HTTP POST /gpu/qmc (minimal payload)')
    payload = json.dumps({
        'currentPrice': 100000.0,
        'mu': 0.05,
        'sigma': 0.3,
        'nPaths': 100,
        'nSteps': 3,
        'dt': 1/252,
    }).encode('utf-8')
    try:
        t0 = time.time()
        req = urllib.request.Request(
            f'{URL}/gpu/qmc',
            data=payload,
            headers={'Content-Type': 'application/json'},
            method='POST',
        )
        with opener().open(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            elapsed = time.time() - t0
            n = data.get('pathsGenerated', '?')
            backend = data.get('backend', '?')
            device = data.get('device', '?')
            compute = data.get('computeTimeMs', '?')
            print(f'      OK  ({elapsed*1000:.0f}ms): {n} paths, backend={backend}, device={device}, compute={compute}ms')
            return True
    except Exception as e:
        print(f'      FAIL: {e}')
        return False


if __name__ == '__main__':
    print(f'=== GPU Service Connectivity Test ===')
    print(f'Target: {URL}')
    print(f'Host: {HOST}  Port: {PORT}')
    print(f'NO_PROXY={os.environ.get("NO_PROXY", "")}')

    tcp_ok = test_tcp()
    if not tcp_ok:
        print(f'\n BLOCKED: TCP port {PORT} is not reachable.')
        print(f'   1. Is gpu-cuda-service.py running?')
        print(f'   2. Firewall: New-NetFirewallRule -DisplayName "TurboBot GPU" -Direction Inbound -Protocol TCP -LocalPort {PORT} -Action Allow')
        sys.exit(1)

    ping_ok = test_ping()
    health_ok = test_health()
    qmc_ok = test_qmc()

    print(f'\n=== Summary ===')
    print(f'  TCP:    {"OK" if tcp_ok else "FAIL"}')
    print(f'  /ping:  {"OK" if ping_ok else "FAIL"}')
    print(f'  /health: {"OK" if health_ok else "FAIL"}')
    print(f'  /gpu/qmc: {"OK" if qmc_ok else "FAIL"}')

    if all([tcp_ok, ping_ok, health_ok, qmc_ok]):
        print(f'\n ALL TESTS PASSED — GPU service is fully reachable.')
        print(f'  You can now run the backtest:')
        print(f'  py -3 .\\ml-service\\backtest_pipeline\\remote_gpu_full_orchestrator.py --jobs single:15m --remote-url {URL}')
    elif tcp_ok and not ping_ok:
        print(f'\n TCP works but HTTP fails.')
        print(f'  Likely cause: antivirus/proxy intercepting HTTP traffic.')
        print(f'  Fix: add 127.0.0.1 to proxy exclusions or disable HTTPS inspection for localhost.')
    elif tcp_ok and ping_ok and not qmc_ok:
        print(f'\n Service reachable but GPU endpoint fails.')
        print(f'  Check gpu-cuda-service.py terminal for errors.')

    sys.exit(0 if all([tcp_ok, ping_ok, qmc_ok]) else 1)

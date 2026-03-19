#!/usr/bin/env python3
"""Quick GPU service connectivity diagnostic.

Usage (Windows):
    py -3 test-gpu-connection.py
    py -3 test-gpu-connection.py http://127.0.0.1:4000

Usage (Linux):
    python3 test-gpu-connection.py
"""

import http.client
import json
import os
import socket
import sys
import time
import urllib.error
import urllib.request
from urllib.parse import urlparse

os.environ['NO_PROXY'] = '*'
os.environ['no_proxy'] = '*'
os.environ['HTTP_PROXY'] = ''
os.environ['HTTPS_PROXY'] = ''
os.environ['http_proxy'] = ''
os.environ['https_proxy'] = ''

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4000'
parsed = urlparse(URL)
HOST = parsed.hostname or '127.0.0.1'
PORT = parsed.port or 4000


def opener():
    return urllib.request.build_opener(urllib.request.ProxyHandler({}))


def test_tcp():
    print(f'\n[1/6] TCP socket test -> {HOST}:{PORT}')
    try:
        t0 = time.time()
        with socket.create_connection((HOST, PORT), timeout=5) as s:
            elapsed = time.time() - t0
            local = s.getsockname()
            remote = s.getpeername()
            print(f'      OK  ({elapsed*1000:.0f}ms)  local={local[0]}:{local[1]} -> remote={remote[0]}:{remote[1]}')
            return True
    except Exception as e:
        print(f'      FAIL: {e}')
        return False


def test_raw_http():
    """Send raw HTTP bytes through a plain socket — no urllib, no http.client."""
    print(f'\n[2/6] RAW socket HTTP GET /ping (bypasses ALL Python HTTP libs)')
    # Try HTTP/1.0 first (simpler, no chunked), then HTTP/1.1
    for http_ver in ('1.0', '1.1'):
        try:
            t0 = time.time()
            with socket.create_connection((HOST, PORT), timeout=15) as s:
                if http_ver == '1.0':
                    raw_request = f'GET /ping HTTP/1.0\r\nHost: {HOST}\r\n\r\n'
                else:
                    raw_request = f'GET /ping HTTP/1.1\r\nHost: {HOST}:{PORT}\r\nConnection: close\r\n\r\n'
                s.sendall(raw_request.encode('ascii'))
                print(f'      [{http_ver}] Sent {len(raw_request)} bytes, waiting ...', flush=True)
                
                chunks = []
                while True:
                    try:
                        chunk = s.recv(4096)
                        if not chunk:
                            break
                        chunks.append(chunk)
                    except socket.timeout:
                        break
                
                elapsed = time.time() - t0
                response = b''.join(chunks).decode('utf-8', errors='replace')
                
                if not response:
                    print(f'      [{http_ver}] Empty response after {elapsed*1000:.0f}ms', flush=True)
                    continue
                
                first_line = response.split('\r\n')[0]
                print(f'      [{http_ver}] Response: {first_line} ({elapsed*1000:.0f}ms)')
                
                if '\r\n\r\n' in response:
                    body = response.split('\r\n\r\n', 1)[1]
                    if 'transfer-encoding: chunked' in response.lower():
                        lines = body.split('\r\n')
                        body_parts = []
                        i = 0
                        while i < len(lines):
                            try:
                                size = int(lines[i], 16)
                                if size == 0:
                                    break
                                if i + 1 < len(lines):
                                    body_parts.append(lines[i + 1])
                                i += 2
                            except ValueError:
                                body_parts.append(lines[i])
                                i += 1
                        body = ''.join(body_parts)
                    
                    try:
                        data = json.loads(body.strip())
                        print(f'      [{http_ver}] Body: {json.dumps(data)}')
                    except Exception:
                        print(f'      [{http_ver}] Body (raw): {body[:200]}')
                
                return '200' in first_line
        except Exception as e:
            print(f'      [{http_ver}] FAIL: {e}')
    
    # Both HTTP versions failed — try alternate port 4001
    print(f'\n      All HTTP versions failed on port {PORT}.')
    print(f'      This usually means antivirus/security software is intercepting HTTP on loopback.')
    print(f'      Try starting gpu-cuda-service.py on a different port:')
    print(f'        $env:GPU_PORT=4001; py -3 gpu-cuda-service.py')
    print(f'      Then test:')
    print(f'        py -3 test-gpu-connection.py http://127.0.0.1:4001')
    return False


def test_http_client():
    """Use http.client directly — lighter than urllib."""
    print(f'\n[3/6] http.client GET /ping (no urllib)')
    try:
        t0 = time.time()
        conn = http.client.HTTPConnection(HOST, PORT, timeout=10)
        conn.request('GET', '/ping', headers={'Host': f'{HOST}:{PORT}'})
        resp = conn.getresponse()
        body = resp.read().decode('utf-8')
        elapsed = time.time() - t0
        conn.close()
        
        data = json.loads(body)
        print(f'      OK  ({elapsed*1000:.0f}ms): status={resp.status} body={json.dumps(data)}')
        return resp.status == 200
    except Exception as e:
        print(f'      FAIL: {e}')
        return False


def test_urllib_ping():
    print(f'\n[4/6] urllib GET /ping (full Python HTTP stack + ProxyHandler)')
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


def test_urllib_health():
    print(f'\n[5/6] urllib GET /health')
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


def test_urllib_qmc():
    print(f'\n[6/6] urllib POST /gpu/qmc')
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
    print(f'=== GPU Service Connectivity Test v2 ===')
    print(f'Target: {URL}')
    print(f'Host: {HOST}  Port: {PORT}')
    print(f'Python: {sys.version}')
    print(f'Platform: {sys.platform}')
    
    # Show proxy env
    for key in ('HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'NO_PROXY', 'no_proxy'):
        val = os.environ.get(key, '')
        if val:
            print(f'  {key}={val}')

    results = {}

    results['tcp'] = test_tcp()
    if not results['tcp']:
        print(f'\n BLOCKED: TCP port {PORT} is not reachable.')
        print(f'   1. Is gpu-cuda-service.py running?')
        print(f'   2. Firewall: New-NetFirewallRule -DisplayName "TurboBot GPU" -Direction Inbound -Protocol TCP -LocalPort {PORT} -Action Allow')
        sys.exit(1)

    results['raw_http'] = test_raw_http()
    results['http_client'] = test_http_client()
    results['urllib_ping'] = test_urllib_ping()
    results['urllib_health'] = test_urllib_health()
    results['urllib_qmc'] = test_urllib_qmc()

    print(f'\n=== Summary ===')
    for name, ok in results.items():
        print(f'  {name:20s}: {"OK" if ok else "FAIL"}')

    if all(results.values()):
        print(f'\n ALL TESTS PASSED — GPU service fully reachable.')
        print(f'  py -3 .\\ml-service\\backtest_pipeline\\remote_gpu_full_orchestrator.py --jobs single:15m --remote-url {URL}')
    elif results['tcp'] and results['raw_http'] and not results['urllib_ping']:
        print(f'\n Raw HTTP works but urllib fails! Python proxy/SSL stack is blocking.')
        print(f'  Check: Windows proxy settings, antivirus HTTP inspection, IE proxy config')
        print(f'  Try: set HTTP_PROXY= && set HTTPS_PROXY= && set NO_PROXY=*')
    elif results['tcp'] and not results['raw_http']:
        print(f'\n TCP connects but HTTP response never arrives.')
        print(f'  Likely: antivirus deep packet inspection blocking HTTP on loopback.')
        print(f'  Fix: add 127.0.0.1 to AV exclusions, or disable HTTP inspection for localhost.')
    elif results['tcp'] and results['raw_http'] and results['http_client'] and results['urllib_ping'] and not results['urllib_qmc']:
        print(f'\n Service reachable but GPU endpoint fails — check gpu-cuda-service.py logs.')

    sys.exit(0 if all(results.values()) else 1)
